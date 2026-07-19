import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getAllTickets, deleteTicket, updateTicket } from '@/lib/services/ticket.service';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (ticketId) {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: { include: { sentBy: true }, orderBy: { sentAt: 'asc' } },
          user: true
        }
      });
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const mappedTicket = {
        id: ticket.id,
        user: {
          uid: ticket.user.id,
          firstName: ticket.user.firstName || ticket.user.name.split(' ')[0] || 'User',
          lastName: ticket.user.lastName || ticket.user.name.split(' ').slice(1).join(' ') || '',
          username: ticket.user.username || ticket.user.email.split('@')[0],
          email: ticket.user.email,
          role: ticket.user.role,
          avatarUrl: ticket.user.avatarUrl || ticket.user.image || undefined,
        },
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        messages: ticket.messages.map((m: any) => ({
          message: m.message,
          sentAt: m.sentAt.toISOString(),
          sentBy: {
            uid: m.sentBy.id,
            firstName: m.sentBy.firstName || m.sentBy.name.split(' ')[0] || 'User',
            lastName: m.sentBy.lastName || m.sentBy.name.split(' ').slice(1).join(' ') || '',
            avatarUrl: m.sentBy.avatarUrl || m.sentBy.image || undefined,
          }
        }))
      };
      return NextResponse.json(mappedTicket);
    }

    const tickets = await getAllTickets();
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Error fetching admin tickets list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, status, assignedToId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId parameter is required' }, { status: 400 });
    }

    await updateTicket(ticketId, { status, assignedToId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating support ticket status/assignee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId parameter is required' }, { status: 400 });
    }

    await deleteTicket(ticketId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
