import { getItem, putItem, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { Group, GroupDocument, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifyMemberAdded, notifyMemberRemoved } from '@/lib/notification-service';
import { getFullName } from '../utils';

function mapGroupRow(g: any, members: UserProfile[], createdBy: UserProfile): Group {
  return {
    id: g.id,
    name: g.name,
    description: g.description || undefined,
    coverImageUrl: g.coverImageUrl || undefined,
    currency: '₹',
    totalExpenses: g.totalExpenses || 0,
    budget: g.budget ? {
      monthlyLimit: Number(g.budget.monthlyLimit || 0),
      enabled: g.budget.enabled !== false,
      alertThresholds: g.budget.alertThresholds || [75, 90, 100],
      categoryLimits: g.budget.categoryLimits || undefined,
      updatedAt: g.budget.updatedAt,
      updatedBy: g.budget.updatedBy,
    } : undefined,
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: g.updatedAt ? new Date(g.updatedAt).toISOString() : undefined,
    archivedAt: g.archivedAt ? new Date(g.archivedAt).toISOString() : undefined,
    members,
    createdBy,
  };
}

export async function createGroup(groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses' | 'groupCreatorId' | 'archivedAt'>): Promise<string> {
  const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const members = groupData.memberIds.map(uid => ({ userId: uid, joinedAt: new Date().toISOString() }));

  const groupDoc = {
    id,
    name: groupData.name,
    description: groupData.description || null,
    coverImageUrl: groupData.coverImageUrl || null,
    currency: '₹',
    totalExpenses: 0,
    createdById: groupData.createdById,
    members,
    createdAt: new Date().toISOString(),
    archivedAt: null,
    budget: groupData.budget || null,
  };

  await putItem(`GROUP#${id}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupData.createdById}`, `GROUP#${id}`);
  return id;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const g = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!g) return null;

  const memberIds: string[] = (g.members || []).map((m: any) => typeof m === 'string' ? m : m.userId);
  const [members, createdBy] = await Promise.all([
    hydrateUsers(memberIds),
    getUserProfile(g.createdById)
  ]);

  if (!createdBy) throw new Error("Created by user not found for group");

  return mapGroupRow(g, members, createdBy);
}

export async function getGroupsByUserId(userId: string): Promise<Group[]> {
  const allGroups = await queryByEntityType<any>('GROUP');
  const userGroups = allGroups.filter((g: any) => {
    if (!g.members) return false;
    return g.members.some((m: any) => (typeof m === 'string' ? m : m.userId) === userId);
  });

  const hydrated = await Promise.all(
    userGroups.map(async (g: any) => {
      const memberIds: string[] = (g.members || []).map((m: any) => typeof m === 'string' ? m : m.userId);
      const [members, createdBy] = await Promise.all([
        hydrateUsers(memberIds),
        getUserProfile(g.createdById)
      ]);
      if (!createdBy) return null;
      return mapGroupRow(g, members, createdBy);
    })
  );

  return hydrated.filter(Boolean) as Group[];
}

export async function getAllGroups(): Promise<Group[]> {
  const allGroups = await queryByEntityType<any>('GROUP');
  const hydrated = await Promise.all(
    allGroups.map(async (g: any) => {
      const memberIds: string[] = (g.members || []).map((m: any) => typeof m === 'string' ? m : m.userId);
      const [members, createdBy] = await Promise.all([
        hydrateUsers(memberIds),
        getUserProfile(g.createdById)
      ]);
      if (!createdBy) return null;
      return mapGroupRow(g, members, createdBy);
    })
  );
  return hydrated.filter(Boolean) as Group[];
}

export async function addMembersToGroup(groupId: string, memberIds: string[], actorId: string): Promise<void> {
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found.");

  const currentMembers: any[] = groupDoc.members || [];
  const existingIds = new Set(currentMembers.map((m: any) => typeof m === 'string' ? m : m.userId));

  memberIds.forEach(id => {
    if (!existingIds.has(id)) {
      currentMembers.push({ userId: id, joinedAt: new Date().toISOString() });
    }
  });

  groupDoc.members = currentMembers;
  groupDoc.updatedAt = new Date().toISOString();
  await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${groupId}`);

  const [actor, newMembers] = await Promise.all([
    getUserProfile(actorId),
    hydrateUsers(memberIds)
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const newMemberNames = newMembers.map(m => getFullName(m.firstName, m.lastName)).join(', ');
  const description = `${actorName} added ${newMemberNames} to the group.`;

  await logHistoryEvent(groupId, 'member_added', actorId, description, { memberIds });

  const recipientIds = memberIds.filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyMemberAdded(recipientIds, actorId, groupId, groupDoc.name || 'your group');
  }
}

export async function addMemberToGroup(groupId: string, newMemberUserId: string, actorId: string): Promise<void> {
  return addMembersToGroup(groupId, [newMemberUserId], actorId);
}

export async function removeMemberFromGroup(groupId: string, memberIdToRemove: string, actorId: string): Promise<void> {
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found.");

  let currentMembers: any[] = groupDoc.members || [];
  currentMembers = currentMembers.filter(m => (typeof m === 'string' ? m : m.userId) !== memberIdToRemove);
  groupDoc.members = currentMembers;
  groupDoc.updatedAt = new Date().toISOString();

  await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${groupId}`);

  const [actor, removedUser] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(memberIdToRemove)
  ]);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const removedUserName = getFullName(removedUser?.firstName, removedUser?.lastName);

  await logHistoryEvent(groupId, 'member_removed', actorId, `${actorName} removed ${removedUserName} from the group.`, {
    removedUserId: memberIdToRemove,
    removedUserName,
  });

  if (memberIdToRemove !== actorId) {
    await notifyMemberRemoved(memberIdToRemove, actorId, groupId, groupDoc.name || 'a group');
  }
}

export async function updateGroup(groupId: string, data: Partial<GroupDocument>, actorId: string): Promise<void> {
  const oldData = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!oldData) throw new Error("Group not found.");

  const updatedGroup = {
    ...oldData,
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
    ...(data.currency !== undefined && { currency: data.currency }),
    ...(data.budget !== undefined && {
      budget: {
        ...data.budget,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      },
    }),
    updatedAt: new Date().toISOString(),
  };

  await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', updatedGroup, `USER#${oldData.createdById}`, `GROUP#${groupId}`);

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);

  const changes: { field: string; from: any; to: any }[] = [];
  if (data.name && data.name !== oldData.name) {
    changes.push({ field: 'Name', from: `"${oldData.name}"`, to: `"${data.name}"` });
  }
  if (data.description !== undefined && data.description !== (oldData.description || '')) {
    changes.push({ field: 'Description', from: `"${oldData.description || ''}"`, to: `"${data.description || ''}"` });
  }
  if (data.budget !== undefined) {
    const oldLimit = oldData.budget?.monthlyLimit ? `₹${oldData.budget.monthlyLimit}` : 'None';
    const newLimit = data.budget?.monthlyLimit ? `₹${data.budget.monthlyLimit}` : 'Disabled';
    changes.push({ field: 'Monthly Budget', from: oldLimit, to: newLimit });
  }

  if (changes.length > 0) {
    const changeSummary = changes.map(c => c.field.toLowerCase()).join(', ');
    const description = `${actorName} updated the group ${changeSummary}.`;
    await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes });
  }
}

export async function archiveGroup(groupId: string, actorId: string): Promise<void> {
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found.");

  groupDoc.archivedAt = new Date().toISOString();
  await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${groupId}`);

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} archived the group.`;
  await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes: [{ field: 'Status', from: 'Active', to: 'Archived' }] });
}

export async function restoreGroup(groupId: string, actorId: string): Promise<void> {
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found.");

  groupDoc.archivedAt = null;
  await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${groupId}`);

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} restored the group.`;
  await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes: [{ field: 'Status', from: 'Archived', to: 'Active' }] });
}

export async function deleteGroupPermanently(groupId: string): Promise<void> {
  await deleteItem(`GROUP#${groupId}`, 'METADATA');
}

export async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (!groupDoc) return false;

  const memberIds = (groupDoc.members || []).map((m: any) => typeof m === 'string' ? m : m.userId);
  return memberIds.includes(userId);
}

// Circular imports helper (resolved at runtime)
import { getGroupBalances } from './balance.service';
