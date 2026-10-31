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

    const body = await request.json();
    const {
      platform = 'webpush',
      deviceId,
      endpoint,
      p256dh,
      auth: authSecret,
      expoPushToken,
      fcmToken,
      deviceName,
    } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    if (platform === 'fcm') {
      const activeToken = fcmToken || expoPushToken;
      if (!activeToken) {
        return NextResponse.json({ error: 'fcmToken is required for fcm platform.' }, { status: 400 });
      }
      const subData = {
        deviceId,
        userId,
        platform: 'fcm',
        fcmToken: activeToken,
        deviceName: deviceName || 'Android Smartphone',
        lastSeen: new Date().toISOString(),
      };
      await putItem(`USER#${userId}`, `PUSH_SUB#${deviceId}`, 'PUSH_SUB', subData, `DEVICE#${deviceId}`, 'PUSH_SUB');
      return NextResponse.json({ success: true });
    }

    if (platform === 'expo') {
      if (!expoPushToken) {
        return NextResponse.json({ error: 'expoPushToken is required for expo platform.' }, { status: 400 });
      }
      const subData = {
        deviceId,
        userId,
        platform: 'expo',
        expoPushToken,
        deviceName: deviceName || 'Mobile Device',
        lastSeen: new Date().toISOString(),
      };
      await putItem(`USER#${userId}`, `PUSH_SUB#${deviceId}`, 'PUSH_SUB', subData, `DEVICE#${deviceId}`, 'PUSH_SUB');
      return NextResponse.json({ success: true });
    }

    if (!endpoint || !p256dh || !authSecret) {
      return NextResponse.json({ error: 'Missing required subscription parameters for web push.' }, { status: 400 });
    }

    const subData = {
      deviceId,
      userId,
      platform: 'webpush',
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
