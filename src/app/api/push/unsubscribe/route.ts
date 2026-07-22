import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { deleteItem } from '@/lib/nosql';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId parameter.' }, { status: 400 });
    }

    await deleteItem(`USER#${session.user.id}`, `PUSH_SUB#${deviceId}`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
