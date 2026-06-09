
import { NextResponse } from 'next/server';
import { firebaseAdmin, getSiteSettingsAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import type { SiteSettings } from '@/types';

export async function POST(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        
        const adminAuth = firebaseAdmin.auth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        if (decodedToken.role !== 'admin') {
             return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const { subject, body } = await request.json();
        if (!subject || !body) {
            return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettingsAdmin();
        const emailSettings = siteSettings.emailSettings;

        if (!emailSettings || (emailSettings.sendingMethod !== 'custom' && emailSettings.sendingMethod !== 'gmail') || !emailSettings.fromAddresses.broadcast) {
            return NextResponse.json({ error: 'Broadcast email sending is not configured.' }, { status: 501 });
        }

        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpSettings.host,
            port: emailSettings.smtpSettings.port,
            secure: emailSettings.smtpSettings.port === 465, // Use true for 465, false for other ports
            auth: {
                user: emailSettings.smtpSettings.user,
                pass: emailSettings.smtpSettings.pass,
            },
        });
        
        await transporter.verify();

        const listUsersResult = await adminAuth.listUsers(1000); // Batched fetching might be needed for >1000 users
        const allUserEmails = listUsersResult.users.map(user => user.email).filter(Boolean) as string[];

        // For large lists, consider queuing this job instead of doing it in one request.
        // For this implementation, we'll send them sequentially.
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

    