import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { markNotificationRead } from '@/lib/services/notification.service';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    await markNotificationRead(notificationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
