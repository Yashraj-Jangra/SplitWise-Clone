import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getTicketsByUserId } from '@/lib/services/ticket.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await getTicketsByUserId(session.user.id);
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
