import { getItem, putItem, queryByPk, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { Settlement, SettlementDocument, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifySettlementAdded } from '@/lib/notification-service';
import { getFullName } from '../utils';

function mapSettlementRow(row: any, paidBy: UserProfile, paidTo: UserProfile): Settlement {
  return {
    id: row.id,
    groupId: row.groupId,
    paidBy,
    paidTo,
    amount: row.amount,
    date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
    notes: row.notes || undefined,
  };
}

export async function addSettlement(
  settlementData: Omit<SettlementDocument, 'date' | 'groupMemberIds'> & { date: Date },
  actorId: string
): Promise<string> {
  const groupDoc = await getItem<any>(`GROUP#${settlementData.groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found to add settlement.");

  const settlementId = `stl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const settlementDoc = {
    id: settlementId,
    groupId: settlementData.groupId,
    paidById: settlementData.paidById,
    paidToId: settlementData.paidToId,
    amount: settlementData.amount,
    date: settlementData.date.toISOString(),
    notes: settlementData.notes || null,
    createdAt: new Date().toISOString(),
  };

  await putItem(
    `GROUP#${settlementData.groupId}`,
    `SETTLEMENT#${settlementId}`,
    'SETTLEMENT',
    settlementDoc,
    `USER#${settlementData.paidById}`,
    `SETTLEMENT#${settlementId}`
  );

  const [actor, paidBy, paidTo] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(settlementData.paidById),
    getUserProfile(settlementData.paidToId),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const paidByName = getFullName(paidBy?.firstName, paidBy?.lastName);
  const paidToName = getFullName(paidTo?.firstName, paidTo?.lastName);

  const description = `${actorName} recorded a settlement: ${paidByName} paid ${paidToName} ₹${Number(settlementData.amount).toFixed(2)}.`;

  await logHistoryEvent(settlementData.groupId, 'settlement_created', actorId, description, {
    settlementId,
    date: settlementData.date
  });

  if (settlementData.paidToId !== actorId) {
    await notifySettlementAdded(settlementData.paidToId, actorId, settlementData.groupId, settlementData.amount, settlementId, groupDoc?.name || 'your group');
  }

  return settlementId;
}

export async function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
  const items = await queryByPk<any>(`GROUP#${groupId}`);
  const settlementDocs = items.filter(i => i.id && i.paidById && i.paidToId);

  const userIds = new Set<string>();
  settlementDocs.forEach(r => {
    userIds.add(r.paidById);
    userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return settlementDocs
    .map(r => {
      const paidBy = userMap.get(r.paidById);
      const paidTo = userMap.get(r.paidToId);
      if (!paidBy || !paidTo) return null;

      return mapSettlementRow(r, paidBy, paidTo);
    })
    .filter((s): s is Settlement => s !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSettlementsByUserId(userId: string): Promise<Settlement[]> {
  const all = await getAllSettlements();
  return all.filter(s => s.paidBy.uid === userId || s.paidTo.uid === userId);
}

export async function getAllSettlements(): Promise<Settlement[]> {
  const settlementDocs = await queryByEntityType<any>('SETTLEMENT');

  const userIds = new Set<string>();
  settlementDocs.forEach(r => {
    userIds.add(r.paidById);
    userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return settlementDocs
    .map(r => {
      const paidBy = userMap.get(r.paidById);
      const paidTo = userMap.get(r.paidToId);
      if (!paidBy || !paidTo) return null;

      return mapSettlementRow(r, paidBy, paidTo);
    })
    .filter((s): s is Settlement => s !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateSettlement(
  settlementId: string,
  data: Partial<SettlementDocument>,
  actorId: string
): Promise<void> {
  // Find existing settlement
  const allSettlements = await queryByEntityType<any>('SETTLEMENT');
  const oldData = allSettlements.find(s => s.id === settlementId);
  if (!oldData) throw new Error("Settlement not found.");

  const updatedDoc = {
    ...oldData,
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.paidById !== undefined && { paidById: data.paidById }),
    ...(data.paidToId !== undefined && { paidToId: data.paidToId }),
    ...(data.date !== undefined && { date: data.date.toISOString() }),
    ...(data.notes !== undefined && { notes: data.notes }),
    updatedAt: new Date().toISOString(),
  };

  await putItem(
    `GROUP#${oldData.groupId}`,
    `SETTLEMENT#${settlementId}`,
    'SETTLEMENT',
    updatedDoc,
    `USER#${updatedDoc.paidById}`,
    `SETTLEMENT#${settlementId}`
  );

  const [actor, newPaidBy, newPaidTo, oldPaidBy, oldPaidTo] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(data.paidById || oldData.paidById),
    getUserProfile(data.paidToId || oldData.paidToId),
    getUserProfile(oldData.paidById),
    getUserProfile(oldData.paidToId),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const changes: { field: string; from: any; to: any }[] = [];

  if (data.amount !== undefined && data.amount !== oldData.amount) {
    changes.push({ field: 'Amount', from: `₹${Number(oldData.amount).toFixed(2)}`, to: `₹${Number(data.amount).toFixed(2)}` });
  }

  const description = `${actorName} updated settlement details.`;
  await logHistoryEvent(oldData.groupId, 'settlement_updated', actorId, description, {
    settlementId,
    changes,
    date: data.date || oldData.date
  });
}

export async function deleteSettlement(settlementId: string, groupId: string, actorId: string): Promise<void> {
  await deleteItem(`GROUP#${groupId}`, `SETTLEMENT#${settlementId}`);
}
