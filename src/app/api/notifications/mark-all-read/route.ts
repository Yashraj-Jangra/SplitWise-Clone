import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { markAllRead } from '@/lib/services/notification.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await markAllRead(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
