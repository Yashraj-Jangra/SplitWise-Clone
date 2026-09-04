import { NextResponse } from 'next/server';
import { getAllTickets } from '@/lib/services/ticket.service';
import { getSiteSettings } from '@/lib/services/settings.service';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
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

        const allTickets = await getAllTickets();
        const ticket = allTickets.find(t => t.id === ticketId);

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

        await transporter.verify();

        const firstMessage = ticket.messages[0]?.message || 'No message content';

        const mailOptions = {
            from: supportEmail,
            to: supportEmail,
            subject: `[${appName}] New Ticket #${ticket.id.slice(0,6)}: ${ticket.subject}`,
            html: `
                <h1>New Support Ticket</h1>
                <p>A new support ticket has been submitted on ${appName}.</p>
                <ul>
                    <li><strong>User:</strong> ${ticket.userName} (${ticket.userEmail})</li>
                    <li><strong>Subject:</strong> ${ticket.subject}</li>
                    <li><strong>Category:</strong> ${ticket.category}</li>
                </ul>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${firstMessage}</p>
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
