import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { deviceId, endpoint, p256dh, auth: authSecret, deviceName } = await request.json();

    if (!deviceId || !endpoint || !p256dh || !authSecret) {
      return NextResponse.json({ error: 'Missing required subscription parameters.' }, { status: 400 });
    }

    // Save VAPID push subscription details in DB
    await prisma.pushSubscription.upsert({
      where: { deviceId },
      create: {
        userId,
        deviceId,
        endpoint,
        p256dh,
        auth: authSecret,
        deviceName: deviceName || 'Unknown Device',
      },
      update: {
        userId, // ensure it's linked to active user if device gets re-used
        endpoint,
        p256dh,
        auth: authSecret,
        deviceName: deviceName || undefined,
        lastSeen: new Date(),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
