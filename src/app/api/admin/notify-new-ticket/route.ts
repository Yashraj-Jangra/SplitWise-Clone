
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import type { SiteSettings, SupportTicket, UserProfile } from '@/types';
import { getSiteSettings } from '@/lib/mock-data';
import { Timestamp } from 'firebase-admin/firestore';

async function getAdminUserProfile(uid: string): Promise<UserProfile | null> {
  const db = firebaseAdmin.firestore();
  const docRef = db.collection('users').doc(uid);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    const data = docSnap.data();
    if (!data) return null;
    return { 
        ...data, 
        uid: docSnap.id, 
        createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
        dob: data.dob ? (data.dob as Timestamp)?.toDate().toISOString() : undefined
    } as UserProfile;
  }
  return null;
}


async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
    const db = firebaseAdmin.firestore();
    const ticketDocRef = db.collection('tickets').doc(ticketId);
    const ticketSnap = await ticketDocRef.get();

    if (!ticketSnap.exists) {
        return null;
    }

    const ticketData = ticketSnap.data();
    if (!ticketData) return null;

    const user = await getAdminUserProfile(ticketData.userId);
    if (!user) return null;

    const messages = await Promise.all(
        ticketData.messages.map(async (msg: any) => {
            const sentBy = await getAdminUserProfile(msg.sentById);
            if (!sentBy) return null;
            return {
                ...msg,
                sentAt: (msg.sentAt as Timestamp).toDate().toISOString(),
                sentBy,
            };
        })
    );

    return {
        id: ticketSnap.id,
        ...ticketData,
        createdAt: (ticketData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (ticketData.updatedAt as Timestamp).toDate().toISOString(),
        user,
        messages: messages.filter(m => m !== null),
    } as SupportTicket;
}

export async function POST(request: Request) {
    try {
        const { ticketId } = await request.json();
        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettings();
        const { emailSettings, appName } = siteSettings;
        const supportEmail = emailSettings?.fromAddresses.support;

        if (!emailSettings || (emailSettings.sendingMethod !== 'custom' && emailSettings.sendingMethod !== 'gmail') || !supportEmail) {
            console.log("Admin notification skipped: Custom mail sending or support email is not configured.");
            return NextResponse.json({ success: true, message: 'Admin notification skipped; mail not configured.' });
        }
        
        const ticket = await getTicketById(ticketId);
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
        }

        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpSettings.host,
            port: emailSettings.smtpSettings.port,
            secure: emailSettings.smtpSettings.port === 465, // true for 465, false for other ports
            auth: {
                user: emailSettings.smtpSettings.user,
                pass: emailSettings.smtpSettings.pass,
            },
        });
        
        await transporter.verify();

        const mailOptions = {
            from: supportEmail,
            to: supportEmail,
            subject: `[${appName} Support] New Ticket #${ticket.id.slice(0,6)}: ${ticket.subject}`,
            html: `
                <h1>New Support Ticket</h1>
                <p>A new support ticket has been submitted on ${appName}.</p>
                <ul>
                    <li><strong>User:</strong> ${ticket.userName} (${ticket.userEmail})</li>
                    <li><strong>Subject:</strong> ${ticket.subject}</li>
                    <li><strong>Category:</strong> ${ticket.category}</li>
                </ul>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${ticket.messages[0].message}</p>
                <p><a href="[APP_URL]/admin/support/${ticket.id}">Click here to view and reply to the ticket.</a></p>
            `.replace('[APP_URL]', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231'), // Replace with your app's actual URL
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Admin notification sent.' });

    } catch (error) {
        console.error('API Error - /api/admin/notify-new-ticket:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send notification: ${errorMessage}` }, { status: 500 });
    }
}
