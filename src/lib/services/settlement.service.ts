import { prisma } from '@/lib/db';
import type { Settlement, SettlementDocument, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifySettlementAdded } from './notification.service';
import { getFullName } from '../utils';
import { format } from 'date-fns';

function mapSettlementRow(row: any, paidBy: UserProfile, paidTo: UserProfile): Settlement {
  return {
    id: row.id,
    groupId: row.groupId,
    paidBy,
    paidTo,
    amount: row.amount,
    date: row.date.toISOString(),
    notes: row.notes || undefined,
  };
}

export async function addSettlement(
  settlementData: Omit<SettlementDocument, 'date' | 'groupMemberIds'> & { date: Date },
  actorId: string
): Promise<string> {
  const groupRow = await prisma.group.findUnique({ where: { id: settlementData.groupId } });
  if (!groupRow) throw new Error("Group not found to add settlement.");

  const settlement = await prisma.settlement.create({
    data: {
      groupId: settlementData.groupId,
      paidById: settlementData.paidById,
      paidToId: settlementData.paidToId,
      amount: settlementData.amount,
      date: settlementData.date,
      notes: settlementData.notes,
    }
  });

  const [actor, paidBy, paidTo] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(settlementData.paidById),
    getUserProfile(settlementData.paidToId),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const paidByName = getFullName(paidBy?.firstName, paidBy?.lastName);
  const paidToName = getFullName(paidTo?.firstName, paidTo?.lastName);

  const description = `${actorName} recorded a settlement: ${paidByName} paid ${paidToName} $${settlementData.amount.toFixed(2)}.`;
  
  await logHistoryEvent(settlementData.groupId, 'settlement_created', actorId, description, {
    settlementId: settlement.id,
    date: settlementData.date
  });

  // Notifications
  if (settlementData.paidToId !== actorId) {
    await notifySettlementAdded(settlementData.paidToId, actorId, settlementData.groupId, settlementData.amount, settlement.id);
  }

  return settlement.id;
}

export async function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
  const rows = await prisma.settlement.findMany({
    where: { groupId },
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.paidById);
    userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const paidBy = userMap.get(r.paidById);
    const paidTo = userMap.get(r.paidToId);
    if (!paidBy || !paidTo) return null;

    return mapSettlementRow(r, paidBy, paidTo);
  }).filter((s): s is Settlement => s !== null);
}

export async function getSettlementsByUserId(userId: string): Promise<Settlement[]> {
  const rows = await prisma.settlement.findMany({
    where: {
      OR: [
        { paidById: userId },
        { paidToId: userId }
      ]
    },
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.paidById);
    userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const paidBy = userMap.get(r.paidById);
    const paidTo = userMap.get(r.paidToId);
    if (!paidBy || !paidTo) return null;

    return mapSettlementRow(r, paidBy, paidTo);
  }).filter((s): s is Settlement => s !== null);
}

export async function getAllSettlements(): Promise<Settlement[]> {
  const rows = await prisma.settlement.findMany({
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.paidById);
    userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const paidBy = userMap.get(r.paidById);
    const paidTo = userMap.get(r.paidToId);
    if (!paidBy || !paidTo) return null;

    return mapSettlementRow(r, paidBy, paidTo);
  }).filter((s): s is Settlement => s !== null);
}

export async function updateSettlement(
  settlementId: string,
  data: Partial<SettlementDocument>,
  actorId: string
): Promise<void> {
  const oldData = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!oldData) throw new Error("Settlement not found.");

  const updateData: any = {};
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.paidById !== undefined) updateData.paidById = data.paidById;
  if (data.paidToId !== undefined) updateData.paidToId = data.paidToId;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await prisma.settlement.update({
    where: { id: settlementId },
    data: updateData
  });

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
    changes.push({ field: 'Amount', from: `$${oldData.amount.toFixed(2)}`, to: `$${data.amount.toFixed(2)}` });
  }
  if (data.paidById && data.paidById !== oldData.paidById) {
    changes.push({ field: 'Payer', from: getFullName(oldPaidBy?.firstName, oldPaidBy?.lastName), to: getFullName(newPaidBy?.firstName, newPaidBy?.lastName) });
  }
  if (data.paidToId && data.paidToId !== oldData.paidToId) {
    changes.push({ field: 'Recipient', from: getFullName(oldPaidTo?.firstName, oldPaidTo?.lastName), to: getFullName(newPaidTo?.firstName, newPaidTo?.lastName) });
  }

  const description = `${actorName} updated settlement details.`;
  await logHistoryEvent(oldData.groupId, 'settlement_updated', actorId, description, {
    settlementId,
    changes,
    date: data.date || oldData.date
  });
}

export async function deleteSettlement(settlementId: string, groupId: string, actorId: string): Promise<void> {
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) return;

  await prisma.settlement.delete({ where: { id: settlementId } });

  const [actor, paidBy, paidTo] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(settlement.paidById),
    getUserProfile(settlement.paidToId),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const paidByName = getFullName(paidBy?.firstName, paidBy?.lastName);
  const paidToName = getFullName(paidTo?.firstName, paidTo?.lastName);

  const description = `${actorName} deleted a settlement of $${settlement.amount.toFixed(2)} from ${paidByName} to ${paidToName}.`;
  
  await logHistoryEvent(groupId, 'settlement_deleted', actorId, description, {
    ...settlement,
    settlementId,
    date: settlement.date
  });
}
