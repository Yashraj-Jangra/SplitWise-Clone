import { getItem, putItem, queryByPk, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { HistoryEvent, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { addExpense } from './expense.service';
import { addSettlement } from './settlement.service';

function mapHistoryRow(row: any, actor: UserProfile): HistoryEvent {
  return {
    id: row.id,
    groupId: row.groupId,
    eventType: row.eventType as any,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    description: row.description,
    data: row.data || undefined,
    restored: !!row.restored,
    actor
  };
}

export async function logHistoryEvent(groupId: string, eventType: string, actorId: string, description: string, data?: any) {
  try {
    const id = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const historyDoc = {
      id,
      groupId,
      eventType,
      actorId,
      description,
      data: data || null,
      restored: false,
      timestamp,
    };

    await putItem(
      `GROUP#${groupId}`,
      `HISTORY#${timestamp}#${id}`,
      'HISTORY',
      historyDoc,
      `USER#${actorId}`,
      `HISTORY#${id}`
    );
  } catch (error) {
    console.error("Failed to log history event:", error);
  }
}

export async function getHistoryByGroupId(groupId: string): Promise<HistoryEvent[]> {
  const items = await queryByPk<any>(`GROUP#${groupId}`);
  const historyDocs = items.filter(i => i.id && i.eventType && i.description);

  const actorIds = [...new Set(historyDocs.map(r => r.actorId))];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  return historyDocs
    .map(r => {
      const actor = actorMap.get(r.actorId);
      if (!actor) return null;
      return mapHistoryRow(r, actor);
    })
    .filter((h): h is HistoryEvent => h !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getHistoryForExpense(expenseId: string, groupId: string): Promise<HistoryEvent[]> {
  const historyDocs = await getHistoryByGroupId(groupId);
  return historyDocs.filter(h => {
    if (h.data?.expenseId === expenseId) return true;
    if (h.data?.originalExpenseId === expenseId) return true;
    return false;
  });
}

export async function restoreExpense(historyEventId: string, actorId: string): Promise<string | null> {
  const allHistory = await queryByEntityType<any>('HISTORY');
  const historyEvent = allHistory.find(h => h.id === historyEventId);

  if (!historyEvent || historyEvent.eventType !== 'expense_deleted' || !historyEvent.data) {
    throw new Error("This history event cannot be restored.");
  }

  const dataToRestore = { ...historyEvent.data };
  if (dataToRestore.date) {
    dataToRestore.date = new Date(dataToRestore.date);
  }

  const newExpenseId = await addExpense(dataToRestore, actorId);

  if (newExpenseId) {
    historyEvent.restored = true;
    historyEvent.updatedAt = new Date().toISOString();
    await putItem(
      `GROUP#${historyEvent.groupId}`,
      `HISTORY#${historyEvent.timestamp || new Date().toISOString()}#${historyEvent.id}`,
      'HISTORY',
      historyEvent,
      `USER#${historyEvent.actorId}`,
      `HISTORY#${historyEvent.id}`
    );

    const actor = await getUserProfile(actorId);
    const actorName = actor ? `${actor.firstName} ${actor.lastName || ''}`.trim() : 'Someone';
    const restoreDescription = `${actorName} restored expense "${dataToRestore.description}" for ₹${(dataToRestore.amount || 0).toFixed(2)}.`;

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
  const allHistory = await queryByEntityType<any>('HISTORY');
  const historyEvent = allHistory.find(h => h.id === historyEventId);

  if (!historyEvent || historyEvent.eventType !== 'settlement_deleted' || !historyEvent.data) {
    throw new Error("This history event cannot be restored.");
  }

  const dataToRestore = { ...historyEvent.data };
  if (dataToRestore.date) {
    dataToRestore.date = new Date(dataToRestore.date);
  }

  const newSettlementId = await addSettlement(dataToRestore, actorId);

  if (newSettlementId) {
    historyEvent.restored = true;
    historyEvent.updatedAt = new Date().toISOString();
    await putItem(
      `GROUP#${historyEvent.groupId}`,
      `HISTORY#${historyEvent.timestamp || new Date().toISOString()}#${historyEvent.id}`,
      'HISTORY',
      historyEvent,
      `USER#${historyEvent.actorId}`,
      `HISTORY#${historyEvent.id}`
    );

    const actor = await getUserProfile(actorId);
    const [paidBy, paidTo] = await Promise.all([
      getUserProfile(dataToRestore.paidById),
      getUserProfile(dataToRestore.paidToId),
    ]);

    const actorName = actor ? `${actor.firstName} ${actor.lastName || ''}`.trim() : 'Someone';
    const paidByName = paidBy ? `${paidBy.firstName} ${paidBy.lastName || ''}`.trim() : 'Someone';
    const paidToName = paidTo ? `${paidTo.firstName} ${paidTo.lastName || ''}`.trim() : 'Someone';

    const restoreDescription = `${actorName} restored a settlement from ${paidByName} to ${paidToName} for ₹${(dataToRestore.amount || 0).toFixed(2)}.`;

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
  const allHistory = await queryByEntityType<any>('HISTORY');
  const h = allHistory.find(item => item.id === historyEventId);
  if (h) {
    await deleteItem(`GROUP#${h.groupId}`, `HISTORY#${h.timestamp || 'UNTIMED'}#${h.id}`);
  }
}

export async function getHistoryEventById(historyEventId: string): Promise<any | null> {
  const allHistory = await queryByEntityType<any>('HISTORY');
  return allHistory.find(item => item.id === historyEventId) || null;
}
