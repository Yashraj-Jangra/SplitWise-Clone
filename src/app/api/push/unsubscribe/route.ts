import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

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

    await prisma.pushSubscription.delete({
      where: { deviceId }
    }).catch(() => {}); // ignore if it doesn't exist

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
