import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/services/settings.service';
import { getUserProfile } from '@/lib/services/user.service';
import nodemailer from 'nodemailer';
import { getFullName } from '@/lib/utils';

export async function POST(request: Request) {
    try {
        const { ticketId, replyMessage, replierId } = await request.json();
        if (!ticketId || !replyMessage || !replierId) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        const [siteSettings, ticket, replier] = await Promise.all([
            getSiteSettings(),
            prisma.supportTicket.findUnique({
                where: { id: ticketId },
                include: { user: true }
            }),
            getUserProfile(replierId)
        ]);

        if (!ticket || !replier) {
            return NextResponse.json({ error: 'Ticket or replier not found.' }, { status: 404 });
        }

        const { emailSettings, appName } = siteSettings;
        const template = siteSettings.emailTemplates?.supportTicketReply;

        const isAdminReply = replier.role === 'admin';
        const recipientEmail = isAdminReply ? ticket.user.email : emailSettings?.fromAddresses.support;
        const recipientName = isAdminReply ? getFullName(ticket.user.firstName || undefined, ticket.user.lastName || undefined) : 'Support Team';

        if (!emailSettings || !emailSettings.smtpSettings || !recipientEmail || !template) {
            console.log("Email notification skipped: Mail sending is not configured or recipient/template is missing.");
            return NextResponse.json({ success: true, message: 'Email notification skipped; mail not configured.' });
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

        const subject = template.subject.replace(/{appName}/g, appName).replace(/{ticketId}/g, ticket.id.slice(0, 8));
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3235';
        const ticketLink = isAdminReply ? `${appUrl}/support` : `${appUrl}/admin/support/${ticket.id}`;

        const body = template.body
            .replace(/{appName}/g, appName)
            .replace(/{userName}/g, recipientName)
            .replace(/{replyMessage}/g, replyMessage)
            .replace(/{ticketLink}/g, ticketLink);

        const mailOptions = {
            from: emailSettings.fromAddresses.support,
            to: recipientEmail,
            subject: subject,
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Reply notification sent.' });

    } catch (error) {
        console.error('API Error - /api/admin/notify-ticket-reply:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send notification: ${errorMessage}` }, { status: 500 });
    }
}
