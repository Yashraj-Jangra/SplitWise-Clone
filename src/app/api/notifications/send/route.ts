import { NextResponse } from 'next/server';
import { firebaseAdmin, getSiteSettingsAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { renderEmail } from '@/lib/email-templates/compiler';
import type { NotificationV2Document, UserNotificationPrefsDocument, NotificationEventType } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized: Missing authorization token' }, { status: 401 });
        }

        let authUid: string;
        try {
            const adminAuth = firebaseAdmin.auth();
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            authUid = decodedToken.uid;
        } catch (err) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { type, recipientIds, title, body: notifBody, actorId, groupId, expenseId, target = 'specific_users', imageUrl } = body as {
            type: NotificationEventType;
            recipientIds: string[];
            title: string;
            body: string;
            actorId?: string;
            groupId?: string;
            expenseId?: string;
            target?: 'all_users' | 'specific_users' | 'group';
            imageUrl?: string;
        };

        if (!type || !title || !notifBody || !recipientIds) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = firebaseAdmin.firestore();
        const settings = await getSiteSettingsAdmin();
        const emailSettings = settings.emailSettings;
        
        let transporter: nodemailer.Transporter | null = null;
        if (emailSettings?.smtpSettings) {
            transporter = nodemailer.createTransport({
                host: emailSettings.smtpSettings.host,
                port: emailSettings.smtpSettings.port,
                secure: emailSettings.smtpSettings.port === 465,
                auth: {
                    user: emailSettings.smtpSettings.user,
                    pass: emailSettings.smtpSettings.pass,
                },
            });
        }

        const fcm = firebaseAdmin.messaging();

        // 1. Fetch user preferences for all recipients
        const prefsSnapshot = await db.collection('user_notification_prefs')
                                      .where('userId', 'in', recipientIds.length ? recipientIds : ['nobody'])
                                      .get();
        
        const prefsMap = new Map<string, UserNotificationPrefsDocument>();
        prefsSnapshot.docs.forEach(doc => {
            prefsMap.set(doc.id, doc.data() as UserNotificationPrefsDocument);
        });

        // 2. Fetch users to get emails
        const usersToEmail: any[] = [];
        const pushTokens: string[] = [];
        const inAppRecipients: string[] = [];

        for (const uid of recipientIds) {
            if (uid === authUid && type !== 'broadcast_announcement' && type !== 'broadcast_critical') {
                continue; // don't notify self unless broadcast
            }

            const prefs = prefsMap.get(uid);
            // Default to true if prefs not found
            const eventPrefs = prefs?.events?.[type] || { inApp: true, push: true, email: true };
            const inAppEnabled = prefs?.inAppEnabled !== false && eventPrefs.inApp;
            const pushEnabled = prefs?.pushEnabled !== false && eventPrefs.push;
            const emailEnabled = prefs?.emailEnabled !== false && eventPrefs.email;

            if (inAppEnabled) inAppRecipients.push(uid);

            if (pushEnabled) {
                const devicesSnap = await db.collection(`push_subscriptions/${uid}/devices`).get();
                devicesSnap.docs.forEach(d => pushTokens.push(d.data().fcmToken));
            }

            if (emailEnabled) {
                 try {
                     const userRecord = await firebaseAdmin.auth().getUser(uid);
                     if (userRecord.email) {
                         usersToEmail.push({ uid, email: userRecord.email, name: userRecord.displayName || 'User' });
                     }
                 } catch(e) {
                     console.error("Failed to fetch user email for UID:", uid);
                 }
            }
        }

        // 3. Write In-App Notification
        if (inAppRecipients.length > 0 || target === 'all_users') {
            const docRef = db.collection('notifications_v2').doc();
            await docRef.set({
                type,
                title,
                body: notifBody,
                recipientIds: target === 'all_users' ? [] : inAppRecipients,
                readBy: [],
                actorId: actorId || null,
                groupId: groupId || null,
                expenseId: expenseId || null,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: authUid || 'system',
                target,
                channels: ['in_app'],
                imageUrl: imageUrl || null
            });
        }

        // 4. Send Push Notifications
        if (pushTokens.length > 0) {
            const message = {
                notification: { title, body: notifBody },
                tokens: pushTokens,
                data: {
                    type,
                    groupId: groupId || '',
                    expenseId: expenseId || '',
                    url: '/' // Can be dynamic
                }
            };
            try {
                const response = await fcm.sendEachForMulticast(message);
                console.log(`FCM Sent. Success: ${response.successCount}, Failures: ${response.failureCount}`);
            } catch (e) {
                console.error("FCM Send Error:", e);
            }
        }

        // 5. Send Emails
        if (usersToEmail.length > 0 && transporter && settings.emailTemplates) {
            // Find corresponding template, default to simple body if none
            let templateName = type as keyof typeof settings.emailTemplates;
            // e.g. expense_added -> expenseAdded
            if (type.includes('_')) {
                 const parts = type.split('_');
                 templateName = (parts[0] + parts[1].charAt(0).toUpperCase() + parts[1].slice(1)) as any;
            }

            const template = settings.emailTemplates[templateName] || { subject: title, body: notifBody };

            for (const user of usersToEmail) {
                // Fetch actor details if present
                let actorName = 'Someone';
                if (actorId) {
                    try {
                        const actor = await firebaseAdmin.auth().getUser(actorId);
                        actorName = actor.displayName || 'Someone';
                    } catch(e) {}
                }

                const variables = {
                    appName: settings.appName,
                    userName: user.name,
                    actorName,
                    amount: '0', // If amount needed, it should be passed in notifBody or data, simplified here.
                    groupName: 'your group', 
                    description: 'an expense',
                    broadcastSubject: title,
                    broadcastBody: notifBody
                };

                const html = renderEmail(template.body, variables, settings, template.subject);

                try {
                    await transporter.sendMail({
                        from: emailSettings?.fromAddresses?.notifications || emailSettings?.fromAddresses?.default || '"App" <noreply@example.com>',
                        to: user.email,
                        subject: renderEmail(template.subject, variables, settings, template.subject), // render subject too
                        html
                    });
                } catch(e) {
                     console.error("Email send error to", user.email, e);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error - /api/notifications/send:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
