import { getItem, putItem, queryByPk, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { Settlement, SettlementDocument, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import {
  notifySettlementAddedToGroup,
  notifySettlementUpdated,
  notifySettlementDeleted,
} from '@/lib/notification-service';
import { getFullName } from '@splitit/core';
import { queueVectorEmbedding } from '@/lib/ai/queue-helper';
import { getGroupsByUserId } from './group.service';
import { invalidateGroupBalanceCache } from './balance.service';

function getFallbackUser(userId: string): UserProfile {
  return {
    uid: userId || 'unknown',
    firstName: 'Former',
    lastName: 'Member',
    username: 'former_member',
    email: '',
    role: 'user',
    createdAt: new Date().toISOString(),
  };
}

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
  const numericAmount = Number(settlementData.amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }

  if (settlementData.paidById === settlementData.paidToId) {
    throw new Error("A member cannot settle with themselves.");
  }

  const groupDoc = await getItem<any>(`GROUP#${settlementData.groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found to add settlement.");
  if (groupDoc.archivedAt) throw new Error("Cannot add a settlement to an archived group.");

  const currentMembers: any[] = groupDoc.members || [];
  const allMemberIds = [...new Set([
    ...currentMembers.map((m: any) => typeof m === 'string' ? m : m.userId),
    groupDoc.createdById
  ].filter(Boolean))];

  if (!allMemberIds.includes(settlementData.paidById) || !allMemberIds.includes(settlementData.paidToId)) {
    throw new Error("Payer and payee must both be members of the group.");
  }

  const settlementId = `stl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const settlementDoc = {
    id: settlementId,
    groupId: settlementData.groupId,
    paidById: settlementData.paidById,
    paidToId: settlementData.paidToId,
    amount: numericAmount,
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

  const description = `${actorName} recorded a settlement: ${paidByName} paid ${paidToName} ₹${numericAmount.toFixed(2)}.`;

  await logHistoryEvent(settlementData.groupId, 'settlement_created', actorId, description, {
    settlementId,
    groupId: settlementData.groupId,
    paidById: settlementData.paidById,
    paidToId: settlementData.paidToId,
    amount: numericAmount,
    date: settlementData.date,
    notes: settlementData.notes || null,
  });

  // Notify all group members (customized for payer, payee, and others; actor excluded)
  await notifySettlementAddedToGroup({
    groupId: settlementData.groupId,
    groupName: groupDoc.name || 'your group',
    settlementId,
    actorId,
    actorName,
    paidById: settlementData.paidById,
    paidByName,
    paidToId: settlementData.paidToId,
    paidToName,
    amount: numericAmount,
    allMemberIds,
  });

  queueVectorEmbedding(settlementId, settlementData.groupId, 'settlement', 'upsert');
  invalidateGroupBalanceCache(settlementData.groupId);
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
      const paidBy = userMap.get(r.paidById) || getFallbackUser(r.paidById);
      const paidTo = userMap.get(r.paidToId) || getFallbackUser(r.paidToId);
      return mapSettlementRow(r, paidBy, paidTo);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSettlementsByUserId(userId: string): Promise<Settlement[]> {
  const userGroups = await getGroupsByUserId(userId);
  if (userGroups.length === 0) return [];

  const groupSettlementLists = await Promise.all(
    userGroups.map(g => getSettlementsByGroupId(g.id))
  );

  const allUserGroupSettlements = groupSettlementLists.flat();
  return allUserGroupSettlements
    .filter(s => s.paidBy.uid === userId || s.paidTo.uid === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAllSettlements(): Promise<Settlement[]> {
  const settlementDocs = await queryByEntityType<any>('SETTLEMENT');

  const userIds = new Set<string>();
  settlementDocs.forEach(r => {
    if (r.paidById) userIds.add(r.paidById);
    if (r.paidToId) userIds.add(r.paidToId);
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return settlementDocs
    .map(r => {
      const paidBy = userMap.get(r.paidById) || getFallbackUser(r.paidById);
      const paidTo = userMap.get(r.paidToId) || getFallbackUser(r.paidToId);
      return mapSettlementRow(r, paidBy, paidTo);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSettlementById(settlementId: string, groupId?: string): Promise<Settlement | null> {
  let doc: any = null;
  if (groupId) {
    doc = await getItem<any>(`GROUP#${groupId}`, `SETTLEMENT#${settlementId}`);
  }
  if (!doc) {
    const all = await queryByEntityType<any>('SETTLEMENT');
    doc = all.find(s => s.id === settlementId);
  }
  if (!doc) return null;

  const [paidBy, paidTo] = await Promise.all([
    getUserProfile(doc.paidById),
    getUserProfile(doc.paidToId),
  ]);

  return mapSettlementRow(
    doc,
    paidBy || getFallbackUser(doc.paidById),
    paidTo || getFallbackUser(doc.paidToId)
  );
}

export async function updateSettlement(
  settlementId: string,
  data: Partial<SettlementDocument>,
  actorId: string
): Promise<void> {
  // Find existing settlement: direct partition lookup if groupId provided, otherwise fallback
  let oldData: any = null;
  if (data.groupId) {
    oldData = await getItem<any>(`GROUP#${data.groupId}`, `SETTLEMENT#${settlementId}`);
  }
  if (!oldData) {
    const allSettlements = await queryByEntityType<any>('SETTLEMENT');
    oldData = allSettlements.find(s => s.id === settlementId);
  }
  if (!oldData) throw new Error("Settlement not found.");

  const groupDocCheck = await getItem<any>(`GROUP#${oldData.groupId}`, 'METADATA');
  if (groupDocCheck?.archivedAt) throw new Error("Cannot modify a settlement in an archived group.");

  if (data.amount !== undefined) {
    const num = Number(data.amount);
    if (!Number.isFinite(num) || num <= 0) {
      throw new Error("Settlement amount must be greater than zero.");
    }
  }

  const finalPaidById = data.paidById || oldData.paidById;
  const finalPaidToId = data.paidToId || oldData.paidToId;
  if (finalPaidById === finalPaidToId) {
    throw new Error("A member cannot settle with themselves.");
  }

  const updatedDoc = {
    ...oldData,
    ...(data.amount !== undefined && { amount: Number(data.amount) }),
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

  queueVectorEmbedding(settlementId, oldData.groupId, 'settlement', 'upsert');
  invalidateGroupBalanceCache(oldData.groupId);

  const [actor, groupDoc] = await Promise.all([
    getUserProfile(actorId),
    getItem<any>(`GROUP#${oldData.groupId}`, 'METADATA'),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const changes: { field: string; from: any; to: any }[] = [];

  if (data.amount !== undefined && data.amount !== oldData.amount) {
    changes.push({ field: 'Amount', from: `₹${Number(oldData.amount).toFixed(2)}`, to: `₹${Number(data.amount).toFixed(2)}` });
  }
  if (data.paidById && data.paidById !== oldData.paidById) {
    const [oldPayer, newPayer] = await Promise.all([
      getUserProfile(oldData.paidById),
      getUserProfile(data.paidById),
    ]);
    changes.push({
      field: 'Payer',
      from: getFullName(oldPayer?.firstName, oldPayer?.lastName),
      to: getFullName(newPayer?.firstName, newPayer?.lastName),
    });
  }
  if (data.paidToId && data.paidToId !== oldData.paidToId) {
    const [oldPayee, newPayee] = await Promise.all([
      getUserProfile(oldData.paidToId),
      getUserProfile(data.paidToId),
    ]);
    changes.push({
      field: 'Payee',
      from: getFullName(oldPayee?.firstName, oldPayee?.lastName),
      to: getFullName(newPayee?.firstName, newPayee?.lastName),
    });
  }
  const oldDateStr = oldData.date ? new Date(oldData.date).toISOString().slice(0, 10) : '';
  const newDateStr = data.date ? data.date.toISOString().slice(0, 10) : '';
  if (newDateStr && oldDateStr !== newDateStr) {
    changes.push({ field: 'Date', from: oldDateStr, to: newDateStr });
  }
  if (data.notes !== undefined && (data.notes || '') !== (oldData.notes || '')) {
    changes.push({ field: 'Notes', from: `"${oldData.notes || ''}"`, to: `"${data.notes || ''}"` });
  }

  const changeSummary = changes.length > 0 ? changes.map(c => c.field.toLowerCase()).join(', ') : 'details';
  const description = `${actorName} updated settlement ${changeSummary}.`;
  await logHistoryEvent(oldData.groupId, 'settlement_updated', actorId, description, {
    settlementId,
    changes,
    date: data.date || oldData.date
  });

  const currentMembers: any[] = groupDoc?.members || [];
  const allMemberIds = [...new Set([
    ...currentMembers.map((m: any) => typeof m === 'string' ? m : m.userId),
    groupDoc?.createdById,
    updatedDoc.paidById,
    updatedDoc.paidToId,
  ].filter(Boolean))];

  const recipientIds = allMemberIds.filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifySettlementUpdated(
      recipientIds,
      actorId,
      oldData.groupId,
      settlementId,
      groupDoc?.name || 'your group',
      description
    );
  }
}

export async function deleteSettlement(settlementId: string, groupId: string, actorId: string): Promise<void> {
  let oldData: any = await getItem<any>(`GROUP#${groupId}`, `SETTLEMENT#${settlementId}`);
  if (!oldData) {
    const allSettlements = await queryByEntityType<any>('SETTLEMENT');
    oldData = allSettlements.find(s => s.id === settlementId);
  }
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (groupDoc?.archivedAt) throw new Error("Cannot delete a settlement from an archived group.");

  if (!oldData) {
    return;
  }

  await deleteItem(`GROUP#${groupId}`, `SETTLEMENT#${settlementId}`);
  invalidateGroupBalanceCache(groupId);
  queueVectorEmbedding(settlementId, groupId, 'settlement', 'delete');

  const [actor, paidBy, paidTo] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(oldData.paidById),
    getUserProfile(oldData.paidToId),
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const paidByName = getFullName(paidBy?.firstName, paidBy?.lastName);
  const paidToName = getFullName(paidTo?.firstName, paidTo?.lastName);

  const description = `${actorName} deleted a settlement of ₹${Number(oldData.amount).toFixed(2)} (${paidByName} paid ${paidToName}).`;

  // Log settlement_deleted with full snapshot so it can be restored
  await logHistoryEvent(groupId, 'settlement_deleted', actorId, description, {
    settlementId,
    groupId,
    paidById: oldData.paidById,
    paidToId: oldData.paidToId,
    amount: Number(oldData.amount),
    date: oldData.date,
    notes: oldData.notes || null,
  });

  // Notify all group members (excluding actor)
  const currentMembers: any[] = groupDoc?.members || [];
  const allMemberIds = [...new Set([
    ...currentMembers.map((m: any) => typeof m === 'string' ? m : m.userId),
    groupDoc?.createdById,
    oldData.paidById,
    oldData.paidToId,
  ].filter(Boolean))];

  const recipientIds = allMemberIds.filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifySettlementDeleted(
      recipientIds,
      actorId,
      groupId,
      groupDoc?.name || 'your group',
      description
    );
  }
}
