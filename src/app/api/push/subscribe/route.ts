import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { putItem } from '@/lib/nosql';

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

    const subData = {
      deviceId,
      userId,
      endpoint,
      p256dh,
      auth: authSecret,
      deviceName: deviceName || 'Unknown Device',
      lastSeen: new Date().toISOString(),
    };

    await putItem(`USER#${userId}`, `PUSH_SUB#${deviceId}`, 'PUSH_SUB', subData, `DEVICE#${deviceId}`, 'PUSH_SUB');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
