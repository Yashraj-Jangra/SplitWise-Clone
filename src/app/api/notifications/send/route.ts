import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import nodemailer from 'nodemailer';
import { renderEmail } from '@/lib/email-templates/compiler';
import { sendEmailViaGmail } from '@/lib/gmail-sender';
import type { NotificationEventType, UserNotificationPrefsDocument } from '@/types';
import { sendVapidPush } from '@/lib/vapid-push';
import { getSiteSettings } from '@/lib/services/settings.service';
import { createNotification, getUserNotificationPrefs } from '@/lib/services/notification.service';
import { getUserProfile } from '@/lib/services/user.service';
import { queryByEntityType } from '@/lib/nosql';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const authUid = session.user.id;
    const body = await request.json();
    const { type, recipientIds, title, body: notifBody, actorId, groupId, expenseId, settlementId, target = 'specific_users', imageUrl, balanceAmount, groupName, upiUrl, actionUrl, forceEmail } = body as {
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
      upiUrl?: string;
      actionUrl?: string;
      forceEmail?: boolean;
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
    const prefsMap = new Map<string, UserNotificationPrefsDocument>();
    for (const uid of recipientIds) {
      const p = await getUserNotificationPrefs(uid);
      if (p) prefsMap.set(uid, p);
    }

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
          const userRecord = await getUserProfile(uid);
          if (userRecord?.email) {
            usersToEmail.push({ uid, email: userRecord.email, name: `${userRecord.firstName} ${userRecord.lastName}`.trim() });
          }
        } catch (e) {
          console.error("Failed to fetch user email for UID:", uid);
        }
      }
    }

    // 3. Write In-App Notification to Oracle Autonomous DB
    if (inAppRecipients.length > 0 || target === 'all_users') {
      await createNotification({
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
        recipientIds: target === 'all_users' ? [] : inAppRecipients,
      });
    }

    // 4. Send VAPID Push Notifications
    if (targetUserIdsForPush.length > 0) {
      const allPushSubs = await queryByEntityType<any>('PUSH_SUB');
      const subscriptions = allPushSubs.filter(s => targetUserIdsForPush.includes(s.userId));

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

      const pushPromises = subscriptions.map((sub: any) => {
        return sendVapidPush({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth
        }, pushPayload).catch(err => {
          console.error(`Failed push to sub ${sub.id}:`, err);
        });
      });

      Promise.allSettled(pushPromises);
    }

    // 5. Send Email Notifications if configured
    if (usersToEmail.length > 0 && (transporter || (emailSettings?.sendingMethod === 'gmail' && emailSettings?.gmailSettings?.refreshToken))) {
      const appName = settings.appName || 'SplitIt';
      const fromAddress = emailSettings?.fromAddresses?.notifications || emailSettings?.fromAddresses?.default || 'notifications@splitit.app';

      for (const u of usersToEmail) {
        try {
          const mailBodyWithUpi = upiUrl
            ? `${notifBody}\n\n[Pay via UPI App (GPay / PhonePe / Paytm)](${upiUrl})`
            : notifBody;

          const targetActionUrl = actionUrl 
            ? `${process.env.NEXT_PUBLIC_APP_URL || ''}${actionUrl}`
            : groupId 
              ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/groups/${groupId}` 
              : (process.env.NEXT_PUBLIC_APP_URL || '');

          const htmlContent = renderEmail(
            mailBodyWithUpi,
            {
              userName: u.name,
              appName,
              actionUrl: targetActionUrl,
              title,
              bodyText: mailBodyWithUpi,
              balanceAmount: balanceAmount || '',
              groupName: groupName || '',
            },
            settings,
            title
          );

          if (emailSettings?.sendingMethod === 'gmail' && emailSettings?.gmailSettings?.refreshToken) {
            await sendEmailViaGmail({
              to: u.email,
              subject: `${title} - ${appName}`,
              text: notifBody,
              html: htmlContent,
              fromAddress,
              refreshToken: emailSettings.gmailSettings.refreshToken
            });
          } else if (transporter) {
            await transporter.sendMail({
              from: `"${appName}" <${fromAddress}>`,
              to: u.email,
              subject: `${title} - ${appName}`,
              text: notifBody,
              html: htmlContent
            });
          }
        } catch (mailErr) {
          console.error(`Failed sending notification email to ${u.email}:`, mailErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
