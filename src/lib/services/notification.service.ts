import { getItem, putItem, queryByPk, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { NotificationV2, UserNotificationPrefsDocument } from '@/types';
import { hydrateUsers } from './user.service';

function mapNotificationRow(row: any, isRead: boolean, actor?: any): NotificationV2 {
  return {
    id: row.id,
    type: row.type as any,
    title: row.title,
    body: row.body,
    groupId: row.groupId || undefined,
    expenseId: row.expenseId || undefined,
    settlementId: row.settlementId || undefined,
    actorId: row.actorId || undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    createdBy: row.createdBy || undefined,
    target: (row.target as any) || 'specific_users',
    channels: row.channels || ['in_app'],
    imageUrl: row.imageUrl || undefined,
    isRead,
    actor,
  };
}

export async function createNotification(data: any): Promise<string> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notifDoc = {
    id: notifId,
    type: data.type,
    title: data.title,
    body: data.body,
    actorId: data.actorId || null,
    groupId: data.groupId || null,
    expenseId: data.expenseId || null,
    settlementId: data.settlementId || null,
    target: data.target || 'specific_users',
    channels: data.channels || ['in_app'],
    imageUrl: data.imageUrl || null,
    createdBy: data.createdBy || null,
    recipientIds: data.recipientIds || [],
    reads: [],
    createdAt: new Date().toISOString(),
  };

  await putItem(
    `NOTIFICATION#${notifId}`,
    'METADATA',
    'NOTIFICATION',
    notifDoc,
    data.actorId ? `USER#${data.actorId}` : null,
    `NOTIFICATION#${notifId}`
  );

  return notifId;
}

export async function getNotificationsForUser(userId: string, limit: number = 50): Promise<NotificationV2[]> {
  const allNotifs = await queryByEntityType<any>('NOTIFICATION');

  const userNotifs = allNotifs.filter(n => {
    if (n.target === 'all_users') return true;
    const recipientIds: string[] = n.recipientIds || [];
    return recipientIds.includes(userId);
  });

  userNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limited = userNotifs.slice(0, limit);

  const actorIds = [...new Set(limited.map(r => r.actorId).filter(Boolean) as string[])];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  return limited.map(r => {
    const reads: string[] = (r.reads || []).map((rd: any) => typeof rd === 'string' ? rd : rd.userId);
    const isRead = reads.includes(userId);
    const actor = r.actorId ? actorMap.get(r.actorId) : undefined;
    return mapNotificationRow(r, isRead, actor);
  });
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const notifDoc = await getItem<any>(`NOTIFICATION#${notificationId}`, 'METADATA');
  if (!notifDoc) return;

  const currentReads: any[] = notifDoc.reads || [];
  const readUserIds = currentReads.map((rd: any) => typeof rd === 'string' ? rd : rd.userId);

  if (!readUserIds.includes(userId)) {
    currentReads.push({ userId, readAt: new Date().toISOString() });
    notifDoc.reads = currentReads;
    notifDoc.updatedAt = new Date().toISOString();
    await putItem(
      `NOTIFICATION#${notificationId}`,
      'METADATA',
      'NOTIFICATION',
      notifDoc,
      notifDoc.actorId ? `USER#${notifDoc.actorId}` : null,
      `NOTIFICATION#${notificationId}`
    );
  }
}

export async function markAllRead(userId: string): Promise<void> {
  const allNotifs = await queryByEntityType<any>('NOTIFICATION');
  const userNotifs = allNotifs.filter(n => {
    if (n.target === 'all_users') return true;
    const recipientIds: string[] = n.recipientIds || [];
    return recipientIds.includes(userId);
  });

  for (const notifDoc of userNotifs) {
    const currentReads: any[] = notifDoc.reads || [];
    const readUserIds = currentReads.map((rd: any) => typeof rd === 'string' ? rd : rd.userId);

    if (!readUserIds.includes(userId)) {
      currentReads.push({ userId, readAt: new Date().toISOString() });
      notifDoc.reads = currentReads;
      notifDoc.updatedAt = new Date().toISOString();
      await putItem(
        `NOTIFICATION#${notifDoc.id}`,
        'METADATA',
        'NOTIFICATION',
        notifDoc,
        notifDoc.actorId ? `USER#${notifDoc.actorId}` : null,
        `NOTIFICATION#${notifDoc.id}`
      );
    }
  }
}

export async function getAllNotifications(): Promise<NotificationV2[]> {
  const allNotifs = await queryByEntityType<any>('NOTIFICATION');
  allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return allNotifs.map(r => mapNotificationRow(r, false));
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteItem(`NOTIFICATION#${notificationId}`, 'METADATA');
}

const DEFAULT_USER_NOTIFICATION_PREFS = {
  inAppEnabled: true,
  pushEnabled: true,
  emailEnabled: true,
  events: {
    expense_added: { inApp: true, push: true, email: false },
    expense_updated: { inApp: true, push: false, email: false },
    expense_deleted: { inApp: true, push: false, email: false },
    settlement_added: { inApp: true, push: true, email: true },
    member_added: { inApp: true, push: true, email: false },
    member_removed: { inApp: true, push: false, email: false },
    balance_reminder: { inApp: true, push: false, email: true },
    payment_reminder: { inApp: true, push: true, email: true },
    payment_confirmation_request: { inApp: true, push: true, email: true },
    support_reply: { inApp: true, push: true, email: true },
    broadcast_announcement: { inApp: true, push: true, email: false },
    broadcast_critical: { inApp: true, push: true, email: true },
  }
};

export async function getUserNotificationPrefs(userId: string): Promise<UserNotificationPrefsDocument> {
  const prefsDoc = await getItem<any>(`USER#${userId}`, 'NOTIFICATION_PREFS');

  if (prefsDoc) {
    return {
      userId,
      inAppEnabled: prefsDoc.inAppEnabled,
      pushEnabled: prefsDoc.pushEnabled,
      emailEnabled: prefsDoc.emailEnabled,
      events: prefsDoc.events as any,
      updatedAt: prefsDoc.updatedAt as any,
    };
  } else {
    const defaultPrefs = {
      userId,
      ...DEFAULT_USER_NOTIFICATION_PREFS,
      updatedAt: new Date().toISOString(),
    };
    await putItem(`USER#${userId}`, 'NOTIFICATION_PREFS', 'USER_PREFS', defaultPrefs);
    return defaultPrefs as any;
  }
}

export async function updateUserNotificationPrefs(userId: string, prefs: Partial<any>): Promise<void> {
  const current = await getUserNotificationPrefs(userId);
  const updated = {
    ...current,
    ...prefs,
    updatedAt: new Date().toISOString(),
  };

  await putItem(`USER#${userId}`, 'NOTIFICATION_PREFS', 'USER_PREFS', updated);
}

// Helpers for notify functions
export async function notifyMemberAdded(recipientIds: string[], actorId: string, groupId: string, groupName: string) {
  await createNotification({
    type: 'member_added',
    title: 'Added to Group',
    body: `You were added to the group "${groupName}".`,
    recipientIds,
    actorId,
    groupId,
    target: 'group'
  });
}

export async function notifyMemberRemoved(recipientId: string, actorId: string, groupId: string, groupName: string) {
  await createNotification({
    type: 'member_removed',
    title: 'Removed from Group',
    body: `You were removed from the group "${groupName}".`,
    recipientIds: [recipientId],
    actorId,
    groupId,
    target: 'specific_users'
  });
}

export async function notifyExpenseAdded(
  recipientIds: string[],
  actorId: string,
  groupId: string,
  expenseId: string,
  description: string,
  amount: number
) {
  await createNotification({
    type: 'expense_added',
    title: 'New Expense Added',
    body: `An expense "${description}" for ₹${Number(amount || 0).toFixed(2)} was added.`,
    recipientIds,
    actorId,
    groupId,
    expenseId,
    target: 'group'
  });
}

export async function notifyExpenseUpdated(
  recipientIds: string[],
  actorId: string,
  groupId: string,
  expenseId: string,
  description: string
) {
  await createNotification({
    type: 'expense_updated',
    title: 'Expense Updated',
    body: `The expense "${description}" was updated.`,
    recipientIds,
    actorId,
    groupId,
    expenseId,
    target: 'group'
  });
}

export async function notifyExpenseDeleted(
  recipientIds: string[],
  actorId: string,
  groupId: string,
  description: string
) {
  await createNotification({
    type: 'expense_deleted',
    title: 'Expense Deleted',
    body: `The expense "${description}" was deleted.`,
    recipientIds,
    actorId,
    groupId,
    target: 'group'
  });
}

export async function notifySettlementAdded(
  recipientId: string,
  actorId: string,
  groupId: string,
  amount: number,
  settlementId?: string
) {
  await createNotification({
    type: 'settlement_added',
    title: 'Payment Received',
    body: `You received a payment of ₹${Number(amount || 0).toFixed(2)}.`,
    recipientIds: [recipientId],
    actorId,
    groupId,
    settlementId,
    target: 'specific_users'
  });
}
