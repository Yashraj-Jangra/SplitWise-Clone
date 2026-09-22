import { NextResponse } from 'next/server';
import { getTicketById } from '@/lib/services/ticket.service';
import { getSiteSettings } from '@/lib/services/settings.service';
import { auth } from '@/lib/auth.server';
import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
    try {
        const internalSecret = request.headers.get('x-internal-secret');
        const isInternal = !!(
            internalSecret &&
            process.env.INTERNAL_API_SECRET &&
            internalSecret === process.env.INTERNAL_API_SECRET
        );

        if (!isInternal) {
            const session = await auth.api.getSession({ headers: request.headers });
            if (!session?.user || session.user.role !== 'admin') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { ticketId } = await request.json();
        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettings();
        const { emailSettings, appName } = siteSettings;
        const supportEmail = (emailSettings as any)?.fromAddresses?.support;

        if (!emailSettings || !(emailSettings as any).smtpSettings || !supportEmail) {
            console.log("Admin notification skipped: Custom mail sending or support email is not configured.");
            return NextResponse.json({ success: true, message: 'Admin notification skipped; mail not configured.' });
        }

        const ticket = await getTicketById(ticketId);

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
        }

        const smtp = (emailSettings as any).smtpSettings;
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        });

        const firstMessage = ticket.messages[0]?.message || 'No message content';
        const safeAppName = escapeHtml(appName || 'SplitIt');
        const safeUserName = escapeHtml(ticket.userName || 'User');
        const safeUserEmail = escapeHtml(ticket.userEmail || '');
        const safeSubject = escapeHtml(ticket.subject || '');
        const safeCategory = escapeHtml(ticket.category || '');
        const safeFirstMessage = escapeHtml(firstMessage);

        const mailOptions = {
            from: supportEmail,
            to: supportEmail,
            subject: `[${safeAppName}] New Ticket #${ticket.id.slice(0, 6)}: ${safeSubject}`,
            html: `
                <h1>New Support Ticket</h1>
                <p>A new support ticket has been submitted on ${safeAppName}.</p>
                <ul>
                    <li><strong>User:</strong> ${safeUserName} (${safeUserEmail})</li>
                    <li><strong>Subject:</strong> ${safeSubject}</li>
                    <li><strong>Category:</strong> ${safeCategory}</li>
                </ul>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${safeFirstMessage}</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231'}/admin/support/${ticket.id}">Click here to view and reply to the ticket.</a></p>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Admin notification sent.' });

    } catch (error) {
        console.error('API Error - /api/admin/notify-new-ticket:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send notification: ${errorMessage}` }, { status: 500 });
    }
}
