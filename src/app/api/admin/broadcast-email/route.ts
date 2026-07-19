import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/services/settings.service';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
        }
        
        if (session.user.role !== 'admin') {
             return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const { subject, body } = await request.json();
        if (!subject || !body) {
            return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettings();
        const emailSettings = siteSettings.emailSettings;

        if (!emailSettings || !emailSettings.smtpSettings || !emailSettings.fromAddresses.broadcast) {
            return NextResponse.json({ error: 'Broadcast email sending is not configured.' }, { status: 501 });
        }

        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpSettings.host,
            port: emailSettings.smtpSettings.port,
            secure: emailSettings.smtpSettings.port === 465,
            auth: {
                user: emailSettings.smtpSettings.user,
                pass: emailSettings.smtpSettings.pass,
            },
        });
        
        await transporter.verify();

        const allUsers = await prisma.user.findMany({
            select: { email: true }
        });
        const allUserEmails = allUsers.map(user => user.email).filter(Boolean) as string[];

        const sendPromises = allUserEmails.map(email => {
             const mailOptions = {
                from: emailSettings.fromAddresses.broadcast,
                to: email, 
                subject: subject,
                text: body,
                html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
            };
            return transporter.sendMail(mailOptions);
        });

        await Promise.all(sendPromises);

        return NextResponse.json({ success: true, message: `Broadcast sent to ${allUserEmails.length} users.`, sentCount: allUserEmails.length });

    } catch (error) {
        console.error('API Error - /api/admin/broadcast-email:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send broadcast: ${errorMessage}` }, { status: 500 });
    }
}