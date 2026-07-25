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
import { queryByEntityType, getItem } from '@/lib/nosql';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = !!(internalSecret && process.env.INTERNAL_API_SECRET && internalSecret === process.env.INTERNAL_API_SECRET);

    let authUid: string;
    if (isInternal) {
      authUid = body.actorId || 'system';
    } else {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
      }
      authUid = session.user.id;
    }

    const { type, recipientIds, title, body: notifBody, actorId, groupId, expenseId, settlementId, target = 'specific_users', imageUrl, balanceAmount, groupName, upiUrl, actionUrl, forceEmail, amount, description } = body as {
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
      amount?: number;
      description?: string;
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

      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';

      // 5.1 Resolve actor and group names for richer email templates
      let actorName = 'A group member';
      if (actorId) {
        try {
          const actorProfile = await getUserProfile(actorId);
          if (actorProfile) {
            actorName = `${actorProfile.firstName} ${actorProfile.lastName || ''}`.trim();
          }
        } catch (e) {
          console.error('Failed to load actor profile:', e);
        }
      }

      let resolvedGroupName = groupName || '';
      if (groupId && !resolvedGroupName) {
        try {
          const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
          if (groupDoc) {
            resolvedGroupName = groupDoc.name;
          }
        } catch (e) {
          console.error('Failed to load group metadata:', e);
        }
      }

      for (const u of usersToEmail) {
        try {
          let httpUpiUrl = upiUrl;
          if (upiUrl && upiUrl.startsWith('upi://')) {
            try {
              const parsed = new URL(upiUrl);
              const pa = parsed.searchParams.get('pa') || '';
              const pn = parsed.searchParams.get('pn') || '';
              const am = parsed.searchParams.get('am') || '';
              httpUpiUrl = `${appBaseUrl}/api/pay-upi?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}`;
            } catch (e) {
              httpUpiUrl = upiUrl;
            }
          }

          // Customize email subject and body dynamically per event type
          let emailSubject = `${title} - ${appName}`;
          let emailBodyText = notifBody;

          const formattedAmount = amount !== undefined ? `₹${Number(amount).toFixed(2)}` : '';

          switch (type) {
            case 'expense_added':
              emailSubject = `💸 New Expense: ${description || 'Expense'} in ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} added a new expense **"${description || 'Expense'}"** in group **"${resolvedGroupName || 'Group'}"**.\n\n**Amount**: ${formattedAmount}\n\nSplit details and options can be viewed inside the app.`;
              break;
            case 'expense_updated':
              emailSubject = `📝 Expense Updated: ${description || 'Expense'} in ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} updated the details of the expense **"${description || 'Expense'}"** in group **"${resolvedGroupName || 'Group'}"**.`;
              break;
            case 'expense_deleted':
              emailSubject = `🗑️ Expense Deleted: ${description || 'Expense'} in ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} deleted the expense **"${description || 'Expense'}"** from group **"${resolvedGroupName || 'Group'}"**.`;
              break;
            case 'settlement_added':
              emailSubject = `🤝 Payment Received in ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} paid you **${formattedAmount}** as a settlement in group **"${resolvedGroupName || 'Group'}"**.\n\nThank you for keeping your balances clean!`;
              break;
            case 'member_added':
              emailSubject = `👥 Added to Group: ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} added you to the group **"${resolvedGroupName || 'Group'}"**.`;
              break;
            case 'member_removed':
              emailSubject = `👋 Removed from Group: ${resolvedGroupName || 'Group'}`;
              emailBodyText = `${actorName} removed you from the group **"${resolvedGroupName || 'Group'}"**.`;
              break;
            case 'balance_reminder':
              emailSubject = `📊 Balance Reminder for ${resolvedGroupName || 'Group'}`;
              emailBodyText = `Here is a friendly update of your outstanding balances in group **"${resolvedGroupName || 'Group'}"**.`;
              break;
          }

          const mailBodyWithUpi = httpUpiUrl
            ? `${emailBodyText}\n\n[⚡ Pay via UPI App (GPay / PhonePe / Paytm)](${httpUpiUrl})`
            : emailBodyText;

          const targetActionUrl = actionUrl 
            ? `${appBaseUrl}${actionUrl}`
            : groupId 
              ? `${appBaseUrl}/groups/${groupId}` 
              : appBaseUrl;

          const htmlContent = renderEmail(
            mailBodyWithUpi,
            {
              userName: u.name,
              appName,
              actionUrl: targetActionUrl,
              title: emailSubject,
              bodyText: mailBodyWithUpi,
              balanceAmount: balanceAmount || formattedAmount || '',
              groupName: resolvedGroupName || '',
            },
            settings,
            emailSubject
          );

          if (emailSettings?.sendingMethod === 'gmail' && emailSettings?.gmailSettings?.refreshToken) {
            await sendEmailViaGmail({
              to: u.email,
              subject: emailSubject,
              text: emailBodyText,
              html: htmlContent,
              fromAddress,
              refreshToken: emailSettings.gmailSettings.refreshToken
            });
          } else if (transporter) {
            await transporter.sendMail({
              from: `"${appName}" <${fromAddress}>`,
              to: u.email,
              subject: emailSubject,
              text: emailBodyText,
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
