import { prisma } from '@/lib/db';
import type { HistoryEvent, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { addExpense } from './expense.service';
import { addSettlement } from './settlement.service';

function mapHistoryRow(row: any, actor: UserProfile): HistoryEvent {
  return {
    id: row.id,
    groupId: row.groupId,
    eventType: row.eventType as any,
    timestamp: row.timestamp.toISOString(),
    description: row.description,
    data: row.data || undefined,
    restored: row.restored,
    actor
  };
}

export async function logHistoryEvent(groupId: string, eventType: string, actorId: string, description: string, data?: any) {
  try {
    await prisma.historyEvent.create({
      data: {
        groupId,
        eventType,
        actorId,
        description,
        data: data || null,
      }
    });
  } catch (error) {
    console.error("Failed to log history event:", error);
  }
}

export async function getHistoryByGroupId(groupId: string): Promise<HistoryEvent[]> {
  const rows = await prisma.historyEvent.findMany({
    where: { groupId },
    orderBy: { timestamp: 'desc' }
  });

  const actorIds = [...new Set(rows.map(r => r.actorId))];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  return rows.map(r => {
    const actor = actorMap.get(r.actorId);
    if (!actor) return null;
    return mapHistoryRow(r, actor);
  }).filter((h): h is HistoryEvent => h !== null);
}

export async function getHistoryForExpense(expenseId: string, groupId: string): Promise<HistoryEvent[]> {
  const rows = await prisma.historyEvent.findMany({
    where: {
      groupId,
      OR: [
        { expenseId },
        {
          data: {
            path: ['expenseId'],
            equals: expenseId,
          },
        },
      ],
    },
    orderBy: { timestamp: 'desc' }
  });

  const actorIds = [...new Set(rows.map(r => r.actorId))];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  return rows.map(r => {
    const actor = actorMap.get(r.actorId);
    if (!actor) return null;
    return mapHistoryRow(r, actor);
  }).filter((h): h is HistoryEvent => h !== null);
}

export async function restoreExpense(historyEventId: string, actorId: string): Promise<string | null> {
  const historyEvent = await prisma.historyEvent.findUnique({
    where: { id: historyEventId }
  });

  if (!historyEvent || historyEvent.eventType !== 'expense_deleted' || !historyEvent.data) {
    throw new Error("This history event cannot be restored.");
  }

  const dataToRestore = historyEvent.data as any;
  
  // Clean date
  if (dataToRestore.date) {
    dataToRestore.date = new Date(dataToRestore.date);
  }

  const newExpenseId = await addExpense(dataToRestore, actorId);

  if (newExpenseId) {
    await prisma.historyEvent.update({
      where: { id: historyEventId },
      data: { restored: true }
    });

    const actor = await getUserProfile(actorId);
    const actorName = actor ? `${actor.firstName} ${actor.lastName || ''}`.trim() : 'Someone';
    const restoreDescription = `${actorName} restored expense "${dataToRestore.description}" for $${(dataToRestore.amount || 0).toFixed(2)}.`;

    await logHistoryEvent(dataToRestore.groupId, 'expense_restored', actorId, restoreDescription, {
      restoredFromHistoryId: historyEventId,
      newExpenseId,
      originalExpenseId: dataToRestore.expenseId,
      expenseId: dataToRestore.expenseId,
      date: dataToRestore.date,
    });

    return newExpenseId;
  }
  return null;
}

export async function restoreSettlement(historyEventId: string, actorId: string): Promise<string | null> {
  const historyEvent = await prisma.historyEvent.findUnique({
    where: { id: historyEventId }
  });

  if (!historyEvent || historyEvent.eventType !== 'settlement_deleted' || !historyEvent.data) {
    throw new Error("This history event cannot be restored.");
  }

  const dataToRestore = historyEvent.data as any;
  if (dataToRestore.date) {
    dataToRestore.date = new Date(dataToRestore.date);
  }

  const newSettlementId = await addSettlement(dataToRestore, actorId);

  if (newSettlementId) {
    await prisma.historyEvent.update({
      where: { id: historyEventId },
      data: { restored: true }
    });

    const actor = await getUserProfile(actorId);
    const [paidBy, paidTo] = await Promise.all([
      getUserProfile(dataToRestore.paidById),
      getUserProfile(dataToRestore.paidToId),
    ]);

    const actorName = actor ? `${actor.firstName} ${actor.lastName || ''}`.trim() : 'Someone';
    const paidByName = paidBy ? `${paidBy.firstName} ${paidBy.lastName || ''}`.trim() : 'Someone';
    const paidToName = paidTo ? `${paidTo.firstName} ${paidTo.lastName || ''}`.trim() : 'Someone';

    const restoreDescription = `${actorName} restored a settlement from ${paidByName} to ${paidToName} for $${(dataToRestore.amount || 0).toFixed(2)}.`;

    await logHistoryEvent(dataToRestore.groupId, 'settlement_restored', actorId, restoreDescription, {
      restoredFromHistoryId: historyEventId,
      newSettlementId,
      originalSettlementId: dataToRestore.settlementId,
      settlementId: dataToRestore.settlementId,
      date: dataToRestore.date,
    });

    return newSettlementId;
  }
  return null;
}

export async function deleteHistoryEvent(historyEventId: string): Promise<void> {
  await prisma.historyEvent.delete({ where: { id: historyEventId } });
}
