import { prisma } from '@/lib/db';
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
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy || undefined,
    target: row.target as any,
    channels: row.channels as any,
    imageUrl: row.imageUrl || undefined,
    isRead,
    actor,
  };
}

export async function createNotification(data: any): Promise<string> {
  const notif = await prisma.$transaction(async (tx) => {
    const row = await tx.notification.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body,
        actorId: data.actorId,
        groupId: data.groupId,
        expenseId: data.expenseId,
        settlementId: data.settlementId,
        target: data.target || 'specific_users',
        channels: data.channels || ['in_app'],
        imageUrl: data.imageUrl,
        createdBy: data.createdBy,
      }
    });

    if (data.recipientIds && data.recipientIds.length > 0) {
      await tx.notificationRecipient.createMany({
        data: data.recipientIds.map((uid: string) => ({
          notificationId: row.id,
          userId: uid
        }))
      });
    }

    return row;
  });

  return notif.id;
}

export async function getNotificationsForUser(userId: string, limit: number = 50): Promise<NotificationV2[]> {
  const rows = await prisma.notification.findMany({
    where: {
      OR: [
        { recipients: { some: { userId } } },
        { target: 'all_users' }
      ]
    },
    include: {
      reads: {
        where: { userId }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const actorIds = [...new Set(rows.map(r => r.actorId).filter(Boolean) as string[])];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  return rows.map(r => {
    const isRead = r.reads.length > 0;
    const actor = r.actorId ? actorMap.get(r.actorId) : undefined;
    return mapNotificationRow(r, isRead, actor);
  });
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId,
        userId
      }
    },
    create: {
      notificationId,
      userId
    },
    update: {}
  });
}

export async function markAllRead(userId: string): Promise<void> {
  const unreadNotifs = await prisma.notification.findMany({
    where: {
      recipients: { some: { userId } },
      reads: { none: { userId } }
    },
    select: { id: true }
  });

  if (unreadNotifs.length === 0) return;

  await prisma.notificationRead.createMany({
    data: unreadNotifs.map(n => ({
      notificationId: n.id,
      userId
    })),
    skipDuplicates: true
  });
}

export async function getAllNotifications(): Promise<NotificationV2[]> {
  const rows = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return rows.map(r => mapNotificationRow(r, false));
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await prisma.notification.delete({ where: { id: notificationId } });
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
  const prefs = await prisma.userNotificationPrefs.findUnique({
    where: { userId }
  });

  if (prefs) {
    return {
      userId: prefs.userId,
      inAppEnabled: prefs.inAppEnabled,
      pushEnabled: prefs.pushEnabled,
      emailEnabled: prefs.emailEnabled,
      events: prefs.events as any,
      updatedAt: prefs.updatedAt as any,
    };
  } else {
    const defaultPrefs = {
      userId,
      ...DEFAULT_USER_NOTIFICATION_PREFS,
    };
    await prisma.userNotificationPrefs.create({
      data: {
        userId,
        inAppEnabled: defaultPrefs.inAppEnabled,
        pushEnabled: defaultPrefs.pushEnabled,
        emailEnabled: defaultPrefs.emailEnabled,
        events: defaultPrefs.events,
        updatedAt: new Date(),
      }
    });
    return {
      ...defaultPrefs,
      updatedAt: new Date() as any,
    };
  }
}

export async function updateUserNotificationPrefs(userId: string, prefs: Partial<any>): Promise<void> {
  const updateData: any = {};
  if (prefs.inAppEnabled !== undefined) updateData.inAppEnabled = prefs.inAppEnabled;
  if (prefs.pushEnabled !== undefined) updateData.pushEnabled = prefs.pushEnabled;
  if (prefs.emailEnabled !== undefined) updateData.emailEnabled = prefs.emailEnabled;
  if (prefs.events !== undefined) updateData.events = prefs.events;

  await prisma.userNotificationPrefs.update({
    where: { userId },
    data: {
      ...updateData,
      updatedAt: new Date(),
    }
  });
}

// Helpers for notify functions (used internally or by API)
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
    body: `An expense "${description}" for $${Number(amount || 0).toFixed(2)} was added.`,

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
    body: `You received a payment of $${Number(amount || 0).toFixed(2)}.`,

    recipientIds: [recipientId],
    actorId,
    groupId,
    settlementId,
    target: 'specific_users'
  });
}

