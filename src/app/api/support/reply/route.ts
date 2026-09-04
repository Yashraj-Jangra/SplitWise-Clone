import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { addTicketReply } from '@/lib/services/ticket.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId, replyMessage } = await request.json();

    if (!ticketId || !replyMessage) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    await addTicketReply(ticketId, session.user.id, replyMessage);

    // Trigger notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
    fetch(`${appUrl}/api/admin/notify-ticket-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        replyMessage,
        replierId: session.user.id
      })
    }).catch(err => console.error('Failed to trigger ticket reply notification:', err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding ticket reply:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
