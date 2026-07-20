import { prisma } from '@/lib/db';
import type { Group, GroupDocument, UserProfile } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifyMemberAdded, notifyMemberRemoved } from './notification.service';
import { getFullName } from '../utils';

function mapGroupRow(groupRow: any, members: UserProfile[], createdBy: UserProfile): Group {
  return {
    id: groupRow.id,
    name: groupRow.name,
    description: groupRow.description || undefined,
    coverImageUrl: groupRow.coverImageUrl || undefined,
    currency: groupRow.currency || undefined,
    totalExpenses: groupRow.totalExpenses,
    createdAt: groupRow.createdAt.toISOString(),
    archivedAt: groupRow.archivedAt ? groupRow.archivedAt.toISOString() : undefined,
    members,
    createdBy,
  };
}

export async function createGroup(groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses' | 'groupCreatorId' | 'archivedAt'>): Promise<string> {
  const group = await prisma.group.create({
    data: {
      name: groupData.name,
      description: groupData.description,
      coverImageUrl: groupData.coverImageUrl,
      currency: groupData.currency,
      totalExpenses: 0,
      createdById: groupData.createdById,
      members: {
        create: groupData.memberIds.map(uid => ({
          userId: uid
        }))
      }
    }
  });

  return group.id;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const groupRow = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: { userId: true }
      }
    }
  });

  if (!groupRow) return null;

  const memberIds = groupRow.members.map(m => m.userId);
  const [members, createdBy] = await Promise.all([
    hydrateUsers(memberIds),
    getUserProfile(groupRow.createdById)
  ]);

  if (!createdBy) throw new Error("Created by user not found for group");

  return mapGroupRow(groupRow, members, createdBy);
}

export async function getGroupsByUserId(userId: string): Promise<Group[]> {
  const groupRows = await prisma.group.findMany({
    where: {
      members: {
        some: { userId }
      },
      archivedAt: null
    },
    include: {
      members: {
        select: { userId: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const allUserIds = new Set<string>();
  groupRows.forEach(g => {
    allUserIds.add(g.createdById);
    g.members.forEach(m => allUserIds.add(m.userId));
  });

  const allUsers = await hydrateUsers(Array.from(allUserIds));
  const userMap = new Map(allUsers.map(u => [u.uid, u]));

  return groupRows.map(g => {
    const createdBy = userMap.get(g.createdById);
    if (!createdBy) return null;
    const members = g.members
      .map(m => userMap.get(m.userId))
      .filter((u): u is UserProfile => u !== undefined);

    return mapGroupRow(g, members, createdBy);
  }).filter((g): g is Group => g !== null);
}

export async function getAllGroups(): Promise<Group[]> {
  const groupRows = await prisma.group.findMany({
    include: {
      members: {
        select: { userId: true }
      }
    }
  });

  const allUserIds = new Set<string>();
  groupRows.forEach(g => {
    allUserIds.add(g.createdById);
    g.members.forEach(m => allUserIds.add(m.userId));
  });

  const allUsers = await hydrateUsers(Array.from(allUserIds));
  const userMap = new Map(allUsers.map(u => [u.uid, u]));

  return groupRows.map(g => {
    const createdBy = userMap.get(g.createdById);
    if (!createdBy) return null;
    const members = g.members
      .map(m => userMap.get(m.userId))
      .filter((u): u is UserProfile => u !== undefined);

    return mapGroupRow(g, members, createdBy);
  }).filter((g): g is Group => g !== null);
}

export async function addMembersToGroup(groupId: string, memberIds: string[], actorId: string): Promise<void> {
  await prisma.groupMember.createMany({
    data: memberIds.map(uid => ({
      groupId,
      userId: uid
    })),
    skipDuplicates: true
  });

  const [actor, newMembers] = await Promise.all([
    getUserProfile(actorId),
    hydrateUsers(memberIds)
  ]);

  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const newMemberNames = newMembers.map(m => getFullName(m.firstName, m.lastName)).join(', ');
  const description = `${actorName} added ${newMemberNames} to the group.`;
  
  await logHistoryEvent(groupId, 'member_added', actorId, description, { memberIds });

  // Notifications
  const groupRow = await prisma.group.findUnique({ where: { id: groupId } });
  const groupName = groupRow?.name || 'your group';
  const recipientIds = memberIds.filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyMemberAdded(recipientIds, actorId, groupId, groupName);
  }
}

export async function removeMemberFromGroup(groupId: string, memberIdToRemove: string, actorId: string): Promise<void> {
  const [actor, memberToRemoveProfile, balances] = await Promise.all([
    getUserProfile(actorId),
    getUserProfile(memberIdToRemove),
    getGroupBalances(groupId),
  ]);

  if (!actor || !memberToRemoveProfile) {
    throw new Error("Could not find user profiles for this action.");
  }

  const memberBalance = balances.find(b => b.user.uid === memberIdToRemove)?.netBalance || 0;
  if (Math.abs(memberBalance) > 0.01) {
    throw new Error(`${getFullName(memberToRemoveProfile.firstName, memberToRemoveProfile.lastName)} has an outstanding balance of ${Math.abs(memberBalance).toFixed(2)} and cannot be removed. Please settle all debts first.`);
  }

  const actorName = getFullName(actor.firstName, actor.lastName);
  const memberName = getFullName(memberToRemoveProfile.firstName, memberToRemoveProfile.lastName);
  const description = `${actorName} removed ${memberName} from the group.`;

  await logHistoryEvent(groupId, 'member_removed', actorId, description, { removedMemberId: memberIdToRemove });

  await prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: memberIdToRemove
      }
    }
  });

  // Notifications
  const groupRow = await prisma.group.findUnique({ where: { id: groupId } });
  const groupName = groupRow?.name || 'a group';
  if (memberIdToRemove !== actorId) {
    await notifyMemberRemoved(memberIdToRemove, actorId, groupId, groupName);
  }
}

export async function updateGroup(groupId: string, data: Partial<GroupDocument>, actorId: string): Promise<void> {
  const oldData = await prisma.group.findUnique({ where: { id: groupId } });
  if (!oldData) throw new Error("Group not found.");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
  if (data.currency !== undefined) updateData.currency = data.currency;

  await prisma.group.update({
    where: { id: groupId },
    data: updateData
  });

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);

  const changes: { field: string; from: any; to: any }[] = [];
  if (data.name && data.name !== oldData.name) {
    changes.push({ field: 'Name', from: `"${oldData.name}"`, to: `"${data.name}"` });
  }
  if (data.description !== undefined && data.description !== (oldData.description || '')) {
    changes.push({ field: 'Description', from: `"${oldData.description || ''}"`, to: `"${data.description || ''}"` });
  }

  if (changes.length > 0) {
    const changeSummary = changes.map(c => c.field.toLowerCase()).join(', ');
    const description = `${actorName} updated the group ${changeSummary}.`;
    await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes });
  }
}

export async function archiveGroup(groupId: string, actorId: string): Promise<void> {
  await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: new Date() }
  });

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} archived the group.`;
  await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes: [{ field: 'Status', from: 'Active', to: 'Archived' }] });
}

export async function restoreGroup(groupId: string, actorId: string): Promise<void> {
  await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: null }
  });

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} restored the group.`;
  await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes: [{ field: 'Status', from: 'Archived', to: 'Active' }] });
}

export async function deleteGroupPermanently(groupId: string): Promise<void> {
  // Cascading deletes handled natively by PostgreSQL schema definitions
  await prisma.group.delete({
    where: { id: groupId }
  });
}

export async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });
  return !!membership;
}

// Circular imports helper (resolved at runtime)
import { getGroupBalances } from './balance.service';
