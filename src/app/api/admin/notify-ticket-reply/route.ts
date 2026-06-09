
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getUserProfile } from '@/lib/mock-data';
import { getSiteSettingsAdmin } from '@/lib/firebase-admin';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SupportTicket, UserProfile } from '@/types';
import { getFullName } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
    const ticketDocRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketDocRef);

    if (!ticketSnap.exists()) {
        return null;
    }

    const ticketData = ticketSnap.data();
    if (!ticketData) return null;

    const user = await getUserProfile(ticketData.userId);
    if (!user) return null;
    
    // This is simplified for the email; we don't need to hydrate every single message sender.
    const messages = ticketData.messages.map((msg: any) => ({
        ...msg,
        sentAt: (msg.sentAt as Timestamp).toDate().toISOString(),
    }));

    return {
        id: ticketSnap.id,
        ...ticketData,
        createdAt: (ticketData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (ticketData.updatedAt as Timestamp).toDate().toISOString(),
        user,
        messages,
    } as SupportTicket;
}


export async function POST(request: Request) {
    try {
        const { ticketId, replyMessage, replierId } = await request.json();
        if (!ticketId || !replyMessage || !replierId) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        const [siteSettings, ticket, replier] = await Promise.all([
            getSiteSettingsAdmin(),
            getTicketById(ticketId),
            getUserProfile(replierId)
        ]);

        if (!ticket || !replier) {
            return NextResponse.json({ error: 'Ticket or replier not found.' }, { status: 404 });
        }

        const { emailSettings, appName } = siteSettings;
        const template = siteSettings.emailTemplates?.supportTicketReply;

        const isAdminReply = replier.role === 'admin';
        const recipientEmail = isAdminReply ? ticket.user.email : emailSettings?.fromAddresses.support;
        const recipientName = isAdminReply ? getFullName(ticket.user.firstName, ticket.user.lastName) : 'Support Team';

        if (!emailSettings || (emailSettings.sendingMethod !== 'custom' && emailSettings.sendingMethod !== 'gmail') || !recipientEmail || !template) {
            console.log("Email notification skipped: Mail sending is not configured or recipient/template is missing.");
            return NextResponse.json({ success: true, message: 'Email notification skipped; mail not configured.' });
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

        const subject = template.subject.replace(/{appName}/g, appName).replace(/{ticketId}/g, ticket.id.slice(0, 8));
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
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
