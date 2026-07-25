/**
 * notification-service.ts
 *
 * ⚠️  This file is imported by BOTH server and client components.
 *
 * It MUST stay free of any static top-level imports that pull in
 * Node.js-only packages (web-push, nodemailer, googleapis, …).
 *
 * Strategy:
 *  • Server path  → dynamic `import('./services/dispatch.service')` at call time.
 *                   Webpack's static analyser never sees the heavy chain.
 *  • Client path  → POST to /api/notifications/send via fetch.
 */

import type { NotificationEventType } from '@/types';

export interface DispatchNotificationParams {
  type: NotificationEventType;
  recipientIds: string[];
  title: string;
  body: string;
  actorId?: string;
  groupId?: string;
  expenseId?: string;
  settlementId?: string;
  target?: 'all_users' | 'specific_users' | 'group';
  amount?: number;
  description?: string;
  forceEmail?: boolean;
  balanceAmount?: string;
  groupName?: string;
  upiUrl?: string;
  actionUrl?: string;
  disclaimer?: string;
  [key: string]: unknown;
}

export async function dispatchNotification(params: DispatchNotificationParams): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      // ── Server path ──────────────────────────────────────────────────────────
      // Dynamic import keeps webpack from statically bundling dispatch.service.ts
      // (and its heavy Node.js deps) into the client bundle.
      const { serverDispatchNotification } = await import('./services/dispatch.service');
      const result = await serverDispatchNotification(params as any);
      if (!result.success) {
        console.error('Failed to dispatch notification:', result.error);
      }
    } else {
      // ── Client path ──────────────────────────────────────────────────────────
      // Client components must go through the API route.
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to dispatch notification:', errorData);
      }
    }
  } catch (error) {
    console.error('Error dispatching notification:', error);
  }
}

// ─── Domain-event helpers ─────────────────────────────────────────────────────

export const notifyExpenseAdded = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  expenseId: string,
  description: string,
  amount: number,
) =>
  dispatchNotification({
    type: 'expense_added',
    recipientIds,
    title: 'New Expense Added',
    body: `An expense "${description}" for ₹${Number(amount || 0).toFixed(2)} was added.`,
    actorId,
    groupId,
    expenseId,
    target: 'group',
    amount,
    description,
  });

export const notifyExpenseUpdated = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  expenseId: string,
  description: string,
) =>
  dispatchNotification({
    type: 'expense_updated',
    recipientIds,
    title: 'Expense Updated',
    body: `The expense "${description}" was updated.`,
    actorId,
    groupId,
    expenseId,
    target: 'group',
    description,
  });

export const notifyExpenseDeleted = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  description: string,
) =>
  dispatchNotification({
    type: 'expense_deleted',
    recipientIds,
    title: 'Expense Deleted',
    body: `The expense "${description}" was deleted.`,
    actorId,
    groupId,
    target: 'group',
    description,
  });

export const notifySettlementAdded = (
  recipientId: string,
  actorId: string,
  groupId: string,
  amount: number,
  settlementId?: string,
  groupName?: string,
) =>
  dispatchNotification({
    type: 'settlement_added',
    recipientIds: [recipientId],
    title: 'Payment Received',
    body: `You received a payment of ₹${Number(amount || 0).toFixed(2)}${groupName ? ` in "${groupName}"` : ''}.`,
    actorId,
    groupId,
    settlementId,
    target: 'specific_users',
    amount,
    balanceAmount: `₹${Number(amount || 0).toFixed(2)}`,
    groupName: groupName || '',
    actionUrl: `/groups/${groupId}`,
  });

export const notifyMemberAdded = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
) =>
  dispatchNotification({
    type: 'member_added',
    recipientIds,
    title: 'Added to Group',
    body: `You were added to the group "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
  });

export const notifyMemberRemoved = (
  recipientId: string,
  actorId: string,
  groupId: string,
  groupName: string,
) =>
  dispatchNotification({
    type: 'member_removed',
    recipientIds: [recipientId],
    title: 'Removed from Group',
    body: `You were removed from the group "${groupName}".`,
    actorId,
    groupId,
    target: 'specific_users',
  });

export const notifySupportReply = (
  recipientId: string,
  actorId: string,
  ticketId: string,
) =>
  dispatchNotification({
    type: 'support_reply',
    recipientIds: [recipientId],
    title: 'Support Ticket Update',
    body: `An admin replied to your ticket #${ticketId.slice(0, 8)}.`,
    actorId,
    target: 'specific_users',
  });

export const broadcastToAll = (
  title: string,
  body: string,
  type: 'broadcast_announcement' | 'broadcast_critical',
  actorId: string,
  _channels: ('in_app' | 'push' | 'email')[] = ['in_app'],
) =>
  dispatchNotification({
    type,
    recipientIds: [],
    title,
    body,
    actorId,
    target: 'all_users',
  });

export const notifyPaymentReminder = (
  recipientId: string,
  actorId: string,
  groupId: string | undefined,
  groupName: string | undefined,
  balanceAmount: number,
  forceEmail = false,
  actorUpiId?: string,
  actorName?: string,
) => {
  const upiUri = actorUpiId
    ? `upi://pay?pa=${encodeURIComponent(actorUpiId)}&pn=${encodeURIComponent(actorName || 'Payee')}&am=${Number(balanceAmount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('SplitWise Settlement')}`
    : undefined;

  const disclaimer =
    "Note: You'll need to update it manually in Splitwise that the amount is paid, because we don't directly receive or track payments and it is a free platform with zero usage fee.";

  const actionUrl = `/dashboard?action=settle&to=${actorId}&amount=${Number(balanceAmount || 0).toFixed(2)}${groupId ? `&groupId=${groupId}` : ''}`;

  return dispatchNotification({
    type: 'payment_reminder',
    recipientIds: [recipientId],
    title: 'Settle Up Reminder',
    body: `A member is asking you to settle up ₹${Number(balanceAmount || 0).toFixed(2)}${groupName ? ` in "${groupName}"` : ''}.\n\n${disclaimer}`,
    actorId,
    groupId,
    target: 'specific_users',
    balanceAmount: `₹${Number(balanceAmount || 0).toFixed(2)}`,
    groupName: groupName || 'your group',
    upiUrl: upiUri,
    actionUrl,
    forceEmail,
    disclaimer,
  });
};
