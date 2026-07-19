import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { deleteHistoryEvent } from '@/lib/services/history.service';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await deleteHistoryEvent(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting history event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
