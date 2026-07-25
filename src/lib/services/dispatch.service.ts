/**
 * Server-side notification dispatch core logic.
 * Called directly by notification-service.ts (no HTTP round-trip).
 * Also used by /api/notifications/send for client-triggered requests.
 */

import nodemailer from 'nodemailer';
import { renderEmail } from '@/lib/email-templates/compiler';
import { sendEmailViaGmail } from '@/lib/gmail-sender';
import type { NotificationEventType, UserNotificationPrefsDocument } from '@/types';
import { sendVapidPush } from '@/lib/vapid-push';
import { getSiteSettings } from '@/lib/services/settings.service';
import { createNotification, getUserNotificationPrefs } from '@/lib/services/notification.service';
import { getUserProfile } from '@/lib/services/user.service';
import { queryByEntityType, getItem } from '@/lib/nosql';

export interface ServerDispatchParams {
  type: NotificationEventType;
  recipientIds: string[];
  title: string;
  body: string;
  actorId?: string | null;
  groupId?: string | null;
  expenseId?: string | null;
  settlementId?: string | null;
  target?: 'all_users' | 'specific_users' | 'group';
  imageUrl?: string | null;
  balanceAmount?: string;
  groupName?: string;
  upiUrl?: string;
  actionUrl?: string;
  forceEmail?: boolean;
  amount?: number;
  description?: string;
  /** The authenticated user ID triggering this. Defaults to actorId or 'system'. */
  authUid?: string;
}

export async function serverDispatchNotification(params: ServerDispatchParams): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const {
    type, recipientIds, title, body: notifBody,
    actorId, groupId, expenseId, settlementId,
    target = 'specific_users', imageUrl, balanceAmount,
    groupName, upiUrl, actionUrl, forceEmail,
    amount, description,
    authUid: _authUid,
  } = params;

  const authUid = _authUid || actorId || 'system';

  if (!type || !title || !notifBody || !recipientIds) {
    return { success: false, error: 'Missing required fields' };
  }

  const settings = await getSiteSettings();
  const emailSettings = settings.emailSettings;

  let transporter: nodemailer.Transporter | null = null;
  if (emailSettings?.smtpSettings?.host) {
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
  const usersToEmail: { uid: string; email: string; name: string }[] = [];
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

    if (emailEnabled || forceEmail) {
      try {
        const userRecord = await getUserProfile(uid);
        if (userRecord?.email) {
          usersToEmail.push({
            uid,
            email: userRecord.email,
            name: `${userRecord.firstName} ${userRecord.lastName || ''}`.trim(),
          });
        }
      } catch {
        console.error('Failed to fetch user email for UID:', uid);
      }
    }
  }

  // 3. Write In-App Notification to Oracle
  let notificationId = `notif_local_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  if (inAppRecipients.length > 0 || target === 'all_users') {
    notificationId = await createNotification({
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
    const subscriptions = allPushSubs.filter((s: any) => targetUserIdsForPush.includes(s.userId));

    let destinationUrl = '/dashboard';
    if (type === 'monthly_summary') {
      destinationUrl = '/analysis';
    } else if (type === 'support_reply') {
      destinationUrl = '/support';
    } else if (type.startsWith('broadcast')) {
      destinationUrl = '/notifications';
    } else if (groupId) {
      if (type === 'payment_reminder') {
        destinationUrl = `/groups/${groupId}?settlementId=${settlementId || ''}&action=settle`;
      } else if (expenseId && (type === 'expense_added' || type === 'expense_updated')) {
        destinationUrl = `/groups/${groupId}?expenseId=${expenseId}&action=view`;
      } else if (settlementId && (type === 'settlement_added' || type === 'payment_confirmation_request')) {
        destinationUrl = `/groups/${groupId}?settlementId=${settlementId}&action=view`;
      } else {
        destinationUrl = `/groups/${groupId}`;
      }
    }

    const pushPayload = {
      title,
      body: notifBody,
      data: {
        type,
        groupId: groupId || '',
        expenseId: expenseId || '',
        settlementId: settlementId || '',
        notificationId,
        url: destinationUrl,
        markReadUrl: `/api/notifications/${notificationId}/read`,
      },
    };

    const pushPromises = subscriptions.map((sub: any) =>
      sendVapidPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
      ).catch((err: any) => {
        console.error(`Failed push to sub ${sub.id}:`, err);
      })
    );

    Promise.allSettled(pushPromises);
  }

  // 5. Send Email Notifications
  if (
    usersToEmail.length > 0 &&
    (transporter || (emailSettings?.sendingMethod === 'gmail' && emailSettings?.gmailSettings?.refreshToken))
  ) {
    const appName = settings.appName || 'SplitIt';
    const fromAddress =
      emailSettings?.fromAddresses?.notifications ||
      emailSettings?.fromAddresses?.default ||
      'notifications@splitit.app';

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';

    // Resolve actor name
    let actorName = 'A group member';
    if (actorId) {
      try {
        const actorProfile = await getUserProfile(actorId);
        if (actorProfile) {
          actorName = `${actorProfile.firstName} ${actorProfile.lastName || ''}`.trim();
        }
      } catch {
        console.error('Failed to load actor profile:', actorId);
      }
    }

    // Resolve group name
    let resolvedGroupName = groupName || '';
    if (groupId && !resolvedGroupName) {
      try {
        const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
        if (groupDoc) resolvedGroupName = groupDoc.name;
      } catch {
        console.error('Failed to load group metadata:', groupId);
      }
    }

    for (const u of usersToEmail) {
      try {
        let httpUpiUrl = upiUrl;
        if (upiUrl?.startsWith('upi://')) {
          try {
            const parsed = new URL(upiUrl);
            const pa = parsed.searchParams.get('pa') || '';
            const pn = parsed.searchParams.get('pn') || '';
            const am = parsed.searchParams.get('am') || '';
            httpUpiUrl = `${appBaseUrl}/api/pay-upi?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}`;
          } catch {
            httpUpiUrl = upiUrl;
          }
        }

        const formattedAmount = amount !== undefined ? `₹${Number(amount).toFixed(2)}` : '';

        let emailSubject = `${title} - ${appName}`;
        let emailBodyText = notifBody;

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
          case 'monthly_summary':
            emailSubject = `📊 Your Monthly Spending Summary - ${appName}`;
            break;
          case 'group_inactivity':
            emailSubject = `😴 Dormant Group: Keep splitting with "${resolvedGroupName || 'Group'}"!`;
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
          emailSubject,
        );

        if (emailSettings?.sendingMethod === 'gmail' && emailSettings?.gmailSettings?.refreshToken) {
          await sendEmailViaGmail({
            to: u.email,
            subject: emailSubject,
            text: emailBodyText,
            html: htmlContent,
            fromAddress,
            refreshToken: emailSettings.gmailSettings.refreshToken,
          });
        } else if (transporter) {
          await transporter.sendMail({
            from: `"${appName}" <${fromAddress}>`,
            to: u.email,
            subject: emailSubject,
            text: emailBodyText,
            html: htmlContent,
          });
        }
      } catch (mailErr) {
        console.error(`Failed sending notification email to ${u.email}:`, mailErr);
      }
    }
  }

  return { success: true, notificationId };
}
