import type { NotificationV2 } from '@/types';

/**
 * Generates the application landing page URL for a given notification.
 * This is used for routing clicks on both the web notification center and push notification clicks.
 */
export function getNotificationUrl(notification: NotificationV2): string | null {
  const { type, groupId, expenseId, settlementId } = notification;

  switch (type) {
    case 'expense_added':
    case 'expense_updated':
      if (groupId && expenseId) {
        return `/groups/${groupId}?expenseId=${expenseId}&action=view`;
      }
      return groupId ? `/groups/${groupId}` : null;

    case 'expense_deleted':
      return groupId ? `/groups/${groupId}` : null;

    case 'settlement_added':
      if (groupId && settlementId) {
        return `/groups/${groupId}?settlementId=${settlementId}&action=view`;
      }
      return groupId ? `/groups/${groupId}` : null;

    case 'member_added':
    case 'member_removed':
    case 'balance_reminder':
    case 'group_inactivity':
      return groupId ? `/groups/${groupId}` : null;

    case 'budget_alert':
    case 'budget_exceeded':
      return groupId ? `/groups/${groupId}?tab=budget` : null;

    case 'payment_reminder':
      if (groupId && settlementId) {
        return `/groups/${groupId}?settlementId=${settlementId}&action=settle`;
      }
      return groupId ? `/groups/${groupId}` : null;

    case 'payment_confirmation_request':
      if (groupId && settlementId) {
        return `/groups/${groupId}?settlementId=${settlementId}&action=view`;
      }
      return groupId ? `/groups/${groupId}` : null;

    case 'monthly_summary':
      return '/analysis';

    case 'support_reply':
      return '/support';

    case 'broadcast_announcement':
    case 'broadcast_critical':
      return '/notifications';

    default:
      return '/dashboard';
  }
}
