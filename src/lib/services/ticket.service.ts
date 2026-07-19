import { prisma } from '@/lib/db';
import type { SupportTicket, SupportTicketMessage, UserProfile } from '@/types';
import { getUserProfile, hydrateUsers } from './user.service';

function mapTicketRow(row: any, user: UserProfile, messages: SupportTicketMessage[], assignedTo?: UserProfile): SupportTicket {
  return {
    id: row.id,
    user,
    assignedTo,
    subject: row.subject,
    category: row.category as any,
    status: row.status as any,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages,
    userName: row.userName,
    userEmail: row.userEmail
  };
}

export async function getTicketsByUserId(userId: string): Promise<SupportTicket[]> {
  const rows = await prisma.supportTicket.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { sentAt: 'asc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.userId);
    if (r.assignedToId) userIds.add(r.assignedToId);
    r.messages.forEach(m => userIds.add(m.sentById));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const user = userMap.get(r.userId);
    if (!user) return null;

    const messages: SupportTicketMessage[] = r.messages.map(m => {
      const sentBy = userMap.get(m.sentById);
      if (!sentBy) return null;
      return {
        message: m.message,
        sentAt: m.sentAt.toISOString(),
        sentBy,
      };
    }).filter((m): m is SupportTicketMessage => m !== null);

    const assignedTo = r.assignedToId ? userMap.get(r.assignedToId) : undefined;
    return mapTicketRow(r, user, messages, assignedTo);
  }).filter((t): t is SupportTicket => t !== null);
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const rows = await prisma.supportTicket.findMany({
    include: {
      messages: {
        orderBy: { sentAt: 'asc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.userId);
    if (r.assignedToId) userIds.add(r.assignedToId);
    r.messages.forEach(m => userIds.add(m.sentById));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const user = userMap.get(r.userId);
    if (!user) return null;

    const messages: SupportTicketMessage[] = r.messages.map(m => {
      const sentBy = userMap.get(m.sentById);
      if (!sentBy) return null;
      return {
        message: m.message,
        sentAt: m.sentAt.toISOString(),
        sentBy,
      };
    }).filter((m): m is SupportTicketMessage => m !== null);

    const assignedTo = r.assignedToId ? userMap.get(r.assignedToId) : undefined;
    return mapTicketRow(r, user, messages, assignedTo);
  }).filter((t): t is SupportTicket => t !== null);
}

export async function deleteTicket(ticketId: string): Promise<void> {
  await prisma.supportTicket.delete({ where: { id: ticketId } });
}

export async function updateTicket(ticketId: string, data: Partial<any>): Promise<void> {
  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  });
}
