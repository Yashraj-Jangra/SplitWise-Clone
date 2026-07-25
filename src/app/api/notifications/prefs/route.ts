import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getUserNotificationPrefs, updateUserNotificationPrefs } from '@/lib/services/notification.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const prefs = await getUserNotificationPrefs(session.user.id);
    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    await updateUserNotificationPrefs(session.user.id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
