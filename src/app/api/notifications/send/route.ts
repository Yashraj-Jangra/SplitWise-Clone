import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth.server';
import nodemailer from 'nodemailer';
import { renderEmail } from '@/lib/email-templates/compiler';
import type { NotificationEventType, UserNotificationPrefsDocument } from '@/types';
import { sendVapidPush } from '@/lib/vapid-push';
import { getSiteSettings } from '@/lib/services/settings.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const authUid = session.user.id;

    const body = await request.json();
    const { type, recipientIds, title, body: notifBody, actorId, groupId, expenseId, settlementId, target = 'specific_users', imageUrl, balanceAmount, groupName } = body as {
      type: NotificationEventType;
      recipientIds: string[];
      title: string;
      body: string;
      actorId?: string;
      groupId?: string;
      expenseId?: string;
      settlementId?: string;
      target?: 'all_users' | 'specific_users' | 'group';
      imageUrl?: string;
      balanceAmount?: string;
      groupName?: string;
    };

    if (!type || !title || !notifBody || !recipientIds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await getSiteSettings();
    const emailSettings = settings.emailSettings;
    
    let transporter: nodemailer.Transporter | null = null;
    if (emailSettings?.smtpSettings && emailSettings.smtpSettings.host) {
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

    // 1. Fetch user preferences
    const prefs = await prisma.userNotificationPrefs.findMany({
      where: { userId: { in: recipientIds.length ? recipientIds : ['nobody'] } }
    });
    const prefsMap = new Map<string, UserNotificationPrefsDocument>();
    prefs.forEach(p => {
      prefsMap.set(p.userId, {
        userId: p.userId,
        inAppEnabled: p.inAppEnabled,
        pushEnabled: p.pushEnabled,
        emailEnabled: p.emailEnabled,
        events: p.events as any,
        updatedAt: p.updatedAt as any
      });
    });

    // 2. Filter channels per user
    const usersToEmail: any[] = [];
    const inAppRecipients: string[] = [];
    const targetUserIdsForPush: string[] = [];

    for (const uid of recipientIds) {
      if (uid === authUid && type !== 'broadcast_announcement' && type !== 'broadcast_critical') {
        continue; // don't notify self unless broadcast
      }

      const userPref = prefsMap.get(uid);
      const eventPrefs = userPref?.events?.[type] || { inApp: true, push: true, email: true };
      const inAppEnabled = userPref?.inAppEnabled !== false && eventPrefs.inApp;
      const pushEnabled = userPref?.pushEnabled !== false && eventPrefs.push;
      const emailEnabled = userPref?.emailEnabled !== false && eventPrefs.email;

      if (inAppEnabled) inAppRecipients.push(uid);
      if (pushEnabled) targetUserIdsForPush.push(uid);

      if (emailEnabled || body.forceEmail) {
        try {
          const userRecord = await prisma.user.findUnique({ where: { id: uid } });
          if (userRecord?.email) {
            usersToEmail.push({ uid, email: userRecord.email, name: userRecord.name || 'User' });
          }
        } catch (e) {
          console.error("Failed to fetch user email for UID:", uid);
        }
      }
    }

    // 3. Write In-App Notification using Prisma transaction
    if (inAppRecipients.length > 0 || target === 'all_users') {
      await prisma.$transaction(async (tx) => {
        const notif = await tx.notification.create({
          data: {
            type,
            title,
            body: notifBody,
            actorId: actorId || null,
            groupId: groupId || null,
            expenseId: expenseId || null,
            settlementId: settlementId || null,
            target,
            channels: ['in_app'],
            imageUrl: imageUrl || null,
            createdBy: authUid,
          }
        });

        if (target !== 'all_users' && inAppRecipients.length > 0) {
          await tx.notificationRecipient.createMany({
            data: inAppRecipients.map(uid => ({
              notificationId: notif.id,
              userId: uid
            }))
          });
        }
      });
    }

    // 4. Send VAPID Push Notifications
    if (targetUserIdsForPush.length > 0) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: targetUserIdsForPush } }
      });

      const pushPayload = {
        title,
        body: notifBody,
        data: {
          type,
          groupId: groupId || '',
          expenseId: expenseId || '',
          settlementId: settlementId || '',
          url: groupId ? `/groups/${groupId}` : '/'
        }
      };

      const pushPromises = subscriptions.map(sub => {
        return sendVapidPush({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth
        }, pushPayload).catch(err => {
          console.error(`Failed to send VAPID push to device ${sub.deviceId}:`, err);
          // If subscription has expired (e.g. 410 Gone status), clean it up
          if (err.statusCode === 410) {
            prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        });
      });

      await Promise.all(pushPromises);
    }

    // 5. Send SMTP Emails
    if (usersToEmail.length > 0 && transporter && settings.emailTemplates) {
      let templateName = type as string;
      if (type.includes('_')) {
        const parts = type.split('_');
        templateName = parts[0] + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }

      const template = (settings.emailTemplates as any)[templateName] || { subject: title, body: notifBody };

      for (const user of usersToEmail) {
        let actorName = 'Someone';
        if (actorId) {
          try {
            const actor = await prisma.user.findUnique({ where: { id: actorId } });
            if (actor) {
              actorName = actor.name || 'Someone';
            }
          } catch (e) {}
        }

        const variables = {
          appName: settings.appName,
          userName: user.name,
          actorName,
          amount: '0',
          balanceAmount: balanceAmount || '0',
          groupName: groupName || 'your group',
          description: 'an expense',
          broadcastSubject: title,
          broadcastBody: notifBody
        };

        const html = renderEmail(template.body, variables, settings, template.subject);

        try {
          await transporter.sendMail({
            from: emailSettings?.fromAddresses?.notifications || emailSettings?.fromAddresses?.default || '"App" <noreply@example.com>',
            to: user.email,
            subject: renderEmail(template.subject, variables, settings, template.subject),
            html
          });
        } catch (e) {
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
