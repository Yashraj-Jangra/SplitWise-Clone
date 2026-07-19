import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { restoreExpense, restoreSettlement } from '@/lib/services/history.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, type } = await request.json();

    if (!eventId || !type) {
      return NextResponse.json({ error: 'eventId and type are required' }, { status: 400 });
    }

    if (type === 'expense') {
      const newExpenseId = await restoreExpense(eventId, session.user.id);
      return NextResponse.json({ success: true, id: newExpenseId });
    } else if (type === 'settlement') {
      const newSettlementId = await restoreSettlement(eventId, session.user.id);
      return NextResponse.json({ success: true, id: newSettlementId });
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error restoring history item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
