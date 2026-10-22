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

export const notifySettlementAddedToGroup = async (params: {
  groupId: string;
  groupName: string;
  settlementId: string;
  actorId: string;
  actorName: string;
  paidById: string;
  paidByName: string;
  paidToId: string;
  paidToName: string;
  amount: number;
  allMemberIds: string[];
}) => {
  const {
    groupId,
    groupName,
    settlementId,
    actorId,
    actorName,
    paidById,
    paidByName,
    paidToId,
    paidToName,
    amount,
    allMemberIds,
  } = params;

  const formattedAmount = `₹${Number(amount || 0).toFixed(2)}`;
  const promises: Promise<void>[] = [];

  // 1. Notify Payee (person receiving money) if not actor
  if (paidToId && paidToId !== actorId) {
    promises.push(
      dispatchNotification({
        type: 'settlement_added',
        recipientIds: [paidToId],
        title: 'Payment Received',
        body: `${paidByName} paid you ${formattedAmount}${groupName ? ` in "${groupName}"` : ''}.`,
        actorId,
        groupId,
        settlementId,
        target: 'specific_users',
        amount,
        balanceAmount: formattedAmount,
        groupName,
        actionUrl: `/groups/${groupId}`,
      })
    );
  }

  // 2. Notify Payer (person who paid) if not actor
  if (paidById && paidById !== actorId) {
    promises.push(
      dispatchNotification({
        type: 'settlement_added',
        recipientIds: [paidById],
        title: 'Payment Recorded',
        body: `${actorName} recorded that you paid ${formattedAmount} to ${paidToName}${groupName ? ` in "${groupName}"` : ''}.`,
        actorId,
        groupId,
        settlementId,
        target: 'specific_users',
        amount,
        balanceAmount: formattedAmount,
        groupName,
        actionUrl: `/groups/${groupId}`,
      })
    );
  }

  // 3. Notify other group members
  const otherRecipients = allMemberIds.filter(
    (id) => id !== actorId && id !== paidById && id !== paidToId
  );
  if (otherRecipients.length > 0) {
    promises.push(
      dispatchNotification({
        type: 'settlement_added',
        recipientIds: otherRecipients,
        title: 'Settlement Recorded',
        body: `${actorName} recorded a settlement: ${paidByName} paid ${paidToName} ${formattedAmount}${groupName ? ` in "${groupName}"` : ''}.`,
        actorId,
        groupId,
        settlementId,
        target: 'group',
        amount,
        balanceAmount: formattedAmount,
        groupName,
        actionUrl: `/groups/${groupId}`,
      })
    );
  }

  await Promise.allSettled(promises);
};

export const notifySettlementUpdated = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  settlementId: string,
  groupName: string,
  description: string
) =>
  dispatchNotification({
    type: 'settlement_updated',
    recipientIds,
    title: 'Settlement Updated',
    body: description || `A settlement was updated in "${groupName}".`,
    actorId,
    groupId,
    settlementId,
    target: 'group',
    groupName,
    actionUrl: `/groups/${groupId}`,
  });

export const notifySettlementDeleted = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  description: string
) =>
  dispatchNotification({
    type: 'settlement_deleted',
    recipientIds,
    title: 'Settlement Deleted',
    body: description || `A settlement was deleted in "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
    groupName,
    actionUrl: `/groups/${groupId}`,
  });

export const notifySettlementRestored = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  settlementId: string,
  groupName: string,
  description: string
) =>
  dispatchNotification({
    type: 'settlement_restored',
    recipientIds,
    title: 'Settlement Restored',
    body: description || `A settlement was restored in "${groupName}".`,
    actorId,
    groupId,
    settlementId,
    target: 'group',
    groupName,
    actionUrl: `/groups/${groupId}`,
  });

export const notifyExpenseRestored = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  expenseId: string,
  description: string,
  amount: number,
  groupName?: string
) =>
  dispatchNotification({
    type: 'expense_restored',
    recipientIds,
    title: 'Expense Restored',
    body: `The expense "${description}" for ₹${Number(amount || 0).toFixed(2)} was restored${groupName ? ` in "${groupName}"` : ''}.`,
    actorId,
    groupId,
    expenseId,
    target: 'group',
    amount,
    description,
    groupName,
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

export const notifyMembersJoined = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  newMemberNames: string
) =>
  dispatchNotification({
    type: 'member_added',
    recipientIds,
    title: 'New Member Joined',
    body: `${newMemberNames} joined "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
    groupName,
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

export const notifyMemberLeft = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  removedUserName: string
) =>
  dispatchNotification({
    type: 'member_removed',
    recipientIds,
    title: 'Member Removed',
    body: `${removedUserName} was removed from "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
    groupName,
  });

export const notifyGroupUpdated = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  description: string
) =>
  dispatchNotification({
    type: 'group_updated',
    recipientIds,
    title: 'Group Updated',
    body: description || `Group details were updated for "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
    groupName,
    actionUrl: `/groups/${groupId}`,
  });

export const notifyBudgetUpdated = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  description: string
) =>
  dispatchNotification({
    type: 'budget_updated',
    recipientIds,
    title: 'Budget Updated',
    body: description || `Budget limits were updated for "${groupName}".`,
    actorId,
    groupId,
    target: 'group',
    groupName,
    actionUrl: `/groups/${groupId}?tab=budget`,
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

export const notifyBudgetAlert = (
  recipientIds: string[],
  actorId: string,
  groupId: string,
  groupName: string,
  threshold: number,
  spentAmount: number,
  monthlyLimit: number,
  isExceeded: boolean,
) => {
  const type: NotificationEventType = isExceeded ? 'budget_exceeded' : 'budget_alert';
  const percentStr = `${Math.round((spentAmount / monthlyLimit) * 100)}%`;
  const spentFormatted = `₹${spentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const limitFormatted = `₹${monthlyLimit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const title = isExceeded
    ? `🚨 Budget Exceeded: "${groupName}"`
    : `⚠️ Budget Alert: "${groupName}" reached ${threshold}%`;

  const body = isExceeded
    ? `Group "${groupName}" has exceeded its monthly limit of ${limitFormatted}. Total spend is currently ${spentFormatted} (${percentStr}).`
    : `Group "${groupName}" has reached ${threshold}% of its monthly budget (${spentFormatted} of ${limitFormatted}).`;

  return dispatchNotification({
    type,
    recipientIds,
    title,
    body,
    actorId,
    groupId,
    target: 'specific_users',
    groupName,
    amount: spentAmount,
    actionUrl: `/groups/${groupId}?tab=budget`,
  });
};
