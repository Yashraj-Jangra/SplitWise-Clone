import { getItem, putItem, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { SupportTicket, SupportTicketMessage, UserProfile } from '@/types';
import { hydrateUsers } from './user.service';

function mapTicketRow(row: any, user: UserProfile, messages: SupportTicketMessage[], assignedTo?: UserProfile): SupportTicket {
  return {
    id: row.id,
    user,
    assignedTo,
    subject: row.subject,
    category: row.category as any,
    status: row.status as any,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    messages,
    userName: row.userName || user.firstName,
    userEmail: row.userEmail || user.email,
  };
}

export async function getTicketsByUserId(userId: string): Promise<SupportTicket[]> {
  const allTickets = await getAllTickets();
  return allTickets.filter(t => t.user.uid === userId);
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const ticketDocs = await queryByEntityType<any>('TICKET');

  const userIds = new Set<string>();
  ticketDocs.forEach(r => {
    userIds.add(r.userId);
    if (r.assignedToId) userIds.add(r.assignedToId);
    (r.messages || []).forEach((m: any) => {
      const sentById = typeof m === 'string' ? m : m.sentById;
      if (sentById) userIds.add(sentById);
    });
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return ticketDocs
    .map(r => {
      const user = userMap.get(r.userId);
      if (!user) return null;

      const messages: SupportTicketMessage[] = (r.messages || []).map((m: any) => {
        const sentById = typeof m === 'string' ? m : m.sentById;
        const sentBy = userMap.get(sentById);
        if (!sentBy) return null;
        return {
          message: m.message,
          sentAt: m.sentAt ? new Date(m.sentAt).toISOString() : new Date().toISOString(),
          sentBy,
        };
      }).filter((m: any): m is SupportTicketMessage => m !== null);

      const assignedTo = r.assignedToId ? userMap.get(r.assignedToId) : undefined;
      return mapTicketRow(r, user, messages, assignedTo);
    })
    .filter((t): t is SupportTicket => t !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function createTicket(data: {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  message: string;
}): Promise<string> {
  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const ticketDoc = {
    id: ticketId,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    subject: data.subject,
    category: data.category,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        sentById: data.userId,
        message: data.message,
        sentAt: now,
      }
    ],
  };

  await putItem(`TICKET#${ticketId}`, 'METADATA', 'TICKET', ticketDoc, `USER#${data.userId}`, `TICKET#${ticketId}`);
  return ticketId;
}

export async function addTicketReply(ticketId: string, sentById: string, message: string): Promise<void> {
  const ticketDoc = await getItem<any>(`TICKET#${ticketId}`, 'METADATA');
  if (!ticketDoc) throw new Error("Ticket not found.");

  const now = new Date().toISOString();
  const existingMessages = ticketDoc.messages || [];
  const updatedMessages = [
    ...existingMessages,
    {
      sentById,
      message,
      sentAt: now,
    }
  ];

  const updatedDoc = {
    ...ticketDoc,
    messages: updatedMessages,
    updatedAt: now,
  };

  await putItem(`TICKET#${ticketId}`, 'METADATA', 'TICKET', updatedDoc, `USER#${ticketDoc.userId}`, `TICKET#${ticketId}`);
}

export async function deleteTicket(ticketId: string): Promise<void> {
  await deleteItem(`TICKET#${ticketId}`, 'METADATA');
}

export async function updateTicket(ticketId: string, data: Partial<any>): Promise<void> {
  const ticketDoc = await getItem<any>(`TICKET#${ticketId}`, 'METADATA');
  if (!ticketDoc) throw new Error("Ticket not found.");

  const updatedDoc = {
    ...ticketDoc,
    ...(data.status !== undefined && { status: data.status }),
    ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
    ...(data.messages !== undefined && { messages: data.messages }),
    updatedAt: new Date().toISOString(),
  };

  await putItem(`TICKET#${ticketId}`, 'METADATA', 'TICKET', updatedDoc, `USER#${ticketDoc.userId}`, `TICKET#${ticketId}`);
}
