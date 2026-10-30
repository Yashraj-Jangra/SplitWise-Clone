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
import { queryByEntityType, getItem, deleteItem } from '@/lib/nosql';

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

export function getNotificationChannelId(type: NotificationEventType): string {
  switch (type) {
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
    case 'expense_restored':
      return 'expenses';
    case 'settlement_added':
    case 'settlement_updated':
    case 'settlement_deleted':
    case 'settlement_restored':
    case 'payment_confirmation_request':
      return 'settlements';
    case 'payment_reminder':
    case 'balance_reminder':
      return 'reminders';
    case 'budget_alert':
    case 'budget_exceeded':
    case 'budget_updated':
      return 'budgets';
    case 'member_added':
    case 'member_removed':
    case 'group_updated':
    case 'group_inactivity':
      return 'groups';
    case 'broadcast_announcement':
    case 'broadcast_critical':
    case 'support_reply':
    case 'monthly_summary':
      return 'announcements';
    default:
      return 'default';
  }
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
      if (type === 'budget_alert' || type === 'budget_exceeded' || type === 'budget_updated') {
        destinationUrl = `/groups/${groupId}?tab=budget`;
      } else if (type === 'payment_reminder') {
        destinationUrl = `/groups/${groupId}?settlementId=${settlementId || ''}&action=settle`;
      } else if (expenseId && (type === 'expense_added' || type === 'expense_updated')) {
        destinationUrl = `/groups/${groupId}?expenseId=${expenseId}&action=view`;
      } else if (settlementId && (type === 'settlement_added' || type === 'settlement_updated' || type === 'payment_confirmation_request')) {
        destinationUrl = `/groups/${groupId}?settlementId=${settlementId}&action=view`;
      } else if (type === 'settlement_deleted' || type === 'settlement_restored' || type === 'expense_deleted' || type === 'expense_restored') {
        destinationUrl = `/groups/${groupId}?tab=history`;
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

    const webSubscriptions = subscriptions.filter((s: any) => s.platform !== 'expo' && s.endpoint);
    const expoSubscriptions = subscriptions.filter((s: any) => (s.platform === 'expo' || s.expoPushToken) && s.expoPushToken);

    const pushPromises: Promise<any>[] = webSubscriptions.map((sub: any) =>
      sendVapidPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
      ).catch((err: any) => {
        console.error(`Failed push to sub ${sub.id}:`, err);
      })
    );


    if (expoSubscriptions.length > 0) {
      const channelId = getNotificationChannelId(type);
      const expoMessages = expoSubscriptions.map((sub: any) => ({
        to: sub.expoPushToken,
        title,
        body: notifBody,
        sound: 'default',
        badge: 1,
        channelId,
        priority: 'high',
        ttl: 86400,
        _displayInForeground: true,
        data: {
          ...pushPayload.data,
          channelId,
        },
      }));

      const expoHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (process.env.EXPO_ACCESS_TOKEN) {
        expoHeaders['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      pushPromises.push(
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: expoHeaders,
          body: JSON.stringify(expoMessages),
        }).then(async (res) => {
          if (!res.ok) {
            console.error('Expo push HTTP error:', res.status, await res.text().catch(() => ''));
          } else {
            const data = await res.json().catch(() => null);
            if (data?.data && Array.isArray(data.data)) {
              for (let i = 0; i < data.data.length; i++) {
                const ticket = data.data[i];
                if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                  const badSub = expoSubscriptions[i];
                  if (badSub) {
                    console.log(`Pruning unregistered push token for user ${badSub.userId}`);
                    deleteItem(`USER#${badSub.userId}`, `PUSH_SUB#${badSub.deviceId}`).catch(() => {});
                  }
                }
              }
            }
          }
        }).catch((err) => {
          console.error('Failed sending Expo push notifications:', err);
        })
      );
    }

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
            emailSubject = `🤝 ${title} in ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nGroup balances have been synchronized. View full settlement details in the app.`;
            break;
          case 'settlement_updated':
            emailSubject = `📝 Settlement Updated in ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nGroup balances and audit history have been adjusted.`;
            break;
          case 'settlement_deleted':
            emailSubject = `🗑️ Settlement Deleted in ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nGroup balances have been recalculated.`;
            break;
          case 'settlement_restored':
            emailSubject = `♻️ Settlement Restored in ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nGroup balances have been updated.`;
            break;
          case 'expense_restored':
            emailSubject = `♻️ Expense Restored: ${description || 'Expense'} in ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${actorName} restored the expense **"${description || 'Expense'}"** in group **"${resolvedGroupName || 'Group'}"**.\n\nGroup balances have been updated.`;
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
          case 'budget_alert':
            emailSubject = `⚠️ Budget Alert: ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nReview category limits and track safe daily burn rates directly in the app.`;
            break;
          case 'budget_exceeded':
            emailSubject = `🚨 Budget Exceeded: ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nYour group has exceeded the monthly budget ceiling. Review expenses and settle outstanding balances in the app.`;
            break;
          case 'group_updated':
            emailSubject = `⚙️ Group Updated: ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nCheck out the updated group details inside the app.`;
            break;
          case 'budget_updated':
            emailSubject = `📊 Group Budget Updated: ${resolvedGroupName || 'Group'}`;
            emailBodyText = `${notifBody}\n\nCheck out the updated budget and category limits in the app.`;
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
