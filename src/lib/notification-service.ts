import { getAuth } from 'firebase/auth';
import { app } from './firebase';
import type { NotificationEventType } from '@/types';

export interface DispatchNotificationParams {
  type: NotificationEventType;
  recipientIds: string[];
  title: string;
  body: string;
  actorId?: string;
  groupId?: string;
  expenseId?: string;
  target?: 'all_users' | 'specific_users' | 'group';
}

export async function dispatchNotification(params: DispatchNotificationParams): Promise<void> {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to dispatch notification:', errorData);
  }
}

// Helpers
export const notifyExpenseAdded = async (
    recipientIds: string[], 
    actorId: string, 
    groupId: string, 
    expenseId: string, 
    description: string, 
    amount: number
) => {
    await dispatchNotification({
        type: 'expense_added',
        recipientIds,
        title: 'New Expense Added',
        body: `An expense "${description}" for ${amount} was added.`,
        actorId,
        groupId,
        expenseId,
        target: 'group'
    });
};

export const notifyExpenseUpdated = async (
    recipientIds: string[], 
    actorId: string, 
    groupId: string, 
    expenseId: string, 
    description: string
) => {
    await dispatchNotification({
        type: 'expense_updated',
        recipientIds,
        title: 'Expense Updated',
        body: `The expense "${description}" was updated.`,
        actorId,
        groupId,
        expenseId,
        target: 'group'
    });
};

export const notifyExpenseDeleted = async (
    recipientIds: string[], 
    actorId: string, 
    groupId: string, 
    description: string
) => {
    await dispatchNotification({
        type: 'expense_deleted',
        recipientIds,
        title: 'Expense Deleted',
        body: `The expense "${description}" was deleted.`,
        actorId,
        groupId,
        target: 'group'
    });
};

export const notifySettlementAdded = async (
    recipientId: string, 
    actorId: string, 
    groupId: string, 
    amount: number
) => {
    await dispatchNotification({
        type: 'settlement_added',
        recipientIds: [recipientId],
        title: 'Payment Received',
        body: `You received a payment of ${amount}.`,
        actorId,
        groupId,
        target: 'specific_users'
    });
};

export const notifyMemberAdded = async (
    recipientIds: string[], 
    actorId: string, 
    groupId: string, 
    groupName: string
) => {
    await dispatchNotification({
        type: 'member_added',
        recipientIds,
        title: 'Added to Group',
        body: `You were added to the group "${groupName}".`,
        actorId,
        groupId,
        target: 'group'
    });
};

export const notifyMemberRemoved = async (
    recipientId: string, 
    actorId: string, 
    groupId: string, 
    groupName: string
) => {
    await dispatchNotification({
        type: 'member_removed',
        recipientIds: [recipientId],
        title: 'Removed from Group',
        body: `You were removed from the group "${groupName}".`,
        actorId,
        groupId,
        target: 'specific_users'
    });
};

export const notifySupportReply = async (
    recipientId: string, 
    actorId: string, 
    ticketId: string
) => {
    await dispatchNotification({
        type: 'support_reply',
        recipientIds: [recipientId],
        title: 'Support Ticket Update',
        body: `An admin replied to your ticket #${ticketId.slice(0, 8)}.`,
        actorId,
        target: 'specific_users'
    });
};

export const broadcastToAll = async (
    title: string, 
    body: string, 
    type: 'broadcast_announcement' | 'broadcast_critical', 
    actorId: string,
    channels: ('in_app' | 'push' | 'email')[] = ['in_app']
) => {
    await dispatchNotification({
        type,
        recipientIds: [],
        title,
        body,
        actorId,
        target: 'all_users'
    });
};
