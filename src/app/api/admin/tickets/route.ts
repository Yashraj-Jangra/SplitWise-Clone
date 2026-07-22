import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getAllTickets, deleteTicket, updateTicket } from '@/lib/services/ticket.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    const tickets = await getAllTickets();

    if (ticketId) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json(ticket);
    }

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
