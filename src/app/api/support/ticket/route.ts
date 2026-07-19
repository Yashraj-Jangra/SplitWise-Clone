import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, category, message } = await request.json();

    if (!subject || !category || !message) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || 'User',
        userEmail: session.user.email,
        subject,
        category,
        status: 'open',
        messages: {
          create: {
            sentById: session.user.id,
            message,
          }
        }
      }
    });

    // Trigger admin notification asynchronously
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3235';
    fetch(`${appUrl}/api/admin/notify-new-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id })
    }).catch(err => console.error('Failed to trigger ticket notification:', err));

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
