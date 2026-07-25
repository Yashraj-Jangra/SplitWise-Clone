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
}

export async function dispatchNotification(params: DispatchNotificationParams): Promise<void> {
  const baseUrl = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231')
    : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window === 'undefined' && process.env.INTERNAL_API_SECRET) {
    headers['x-internal-secret'] = process.env.INTERNAL_API_SECRET;
  }

  const bodyString = JSON.stringify(params);

  try {
    let ok = false;
    let errorData = {};

    if (typeof window === 'undefined') {
      // Use native Node.js HTTP/HTTPS to bypass Next.js patched fetch header-forwarding bugs
      const { URL } = eval("require('url')");
      const parsedUrl = new URL(`${baseUrl}/api/notifications/send`);
      const protocol = parsedUrl.protocol === 'https:' ? eval("require('https')") : eval("require('http')");
      const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);

      const res = await new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
        const req = protocol.request({
          hostname: parsedUrl.hostname,
          port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(bodyString),
          }
        }, (response: any) => {
          let data = '';
          response.on('data', (chunk: any) => { data += chunk; });
          response.on('end', () => {
            resolve({ statusCode: response.statusCode || 200, data });
          });
        });

        req.on('error', (err: any) => reject(err));
        req.write(bodyString);
        req.end();
      });

      ok = res.statusCode >= 200 && res.statusCode < 300;
      if (!ok) {
        try {
          errorData = JSON.parse(res.data);
        } catch (_) {}
      }
    } else {
      const response = await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers,
        body: bodyString,
      });
      ok = response.ok;
      if (!ok) {
        errorData = await response.json().catch(() => ({}));
      }
    }

    if (!ok) {
      console.error('Failed to dispatch notification:', errorData);
    }
  } catch (error) {
    console.error('Error dispatching notification:', error);
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
        target: 'group',
        amount,
        description
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
        target: 'group',
        description
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
        target: 'group',
        description
    });
};

export const notifySettlementAdded = async (
    recipientId: string, 
    actorId: string, 
    groupId: string, 
    amount: number,
    settlementId?: string,
    groupName?: string
) => {
    await dispatchNotification({
        type: 'settlement_added',
        recipientIds: [recipientId],
        title: 'Payment Received',
        body: `You received a payment of ₹${Number(amount || 0).toFixed(2)}${groupName ? ` in "${groupName}"` : ''}.`,
        actorId,
        groupId,
        settlementId,
        target: 'specific_users',
        amount,
        ...({
            balanceAmount: `₹${Number(amount || 0).toFixed(2)}`,
            groupName: groupName || '',
            actionUrl: `/groups/${groupId}`
        } as any)
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

export const notifyPaymentReminder = async (
    recipientId: string, 
    actorId: string, 
    groupId: string | undefined, 
    groupName: string | undefined,
    balanceAmount: number,
    forceEmail: boolean = false,
    actorUpiId?: string,
    actorName?: string
) => {
    const upiUri = actorUpiId 
        ? `upi://pay?pa=${encodeURIComponent(actorUpiId)}&pn=${encodeURIComponent(actorName || 'Payee')}&am=${Number(balanceAmount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('SplitWise Settlement')}` 
        : undefined;

    const disclaimer = "Note: You'll need to update it manually in Splitwise that the amount is paid, because we don't directly receive or track payments and it is a free platform with zero usage fee.";

    const actionUrl = `/dashboard?action=settle&to=${actorId}&amount=${Number(balanceAmount || 0).toFixed(2)}${groupId ? `&groupId=${groupId}` : ''}`;

    await dispatchNotification({
        type: 'payment_reminder',
        recipientIds: [recipientId],
        title: 'Settle Up Reminder',
        body: `A member is asking you to settle up ₹${Number(balanceAmount || 0).toFixed(2)}${groupName ? ` in "${groupName}"` : ''}.\n\n${disclaimer}`,
        actorId,
        groupId,
        target: 'specific_users',
        ...({
            balanceAmount: `₹${Number(balanceAmount || 0).toFixed(2)}`,
            groupName: groupName || 'your group',
            upiUrl: upiUri,
            actionUrl,
            disclaimer,
            forceEmail
        } as any)
    });
};



