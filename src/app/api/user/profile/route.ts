import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getUserProfile, updateUser } from '@/lib/services/user.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds');
    const userId = searchParams.get('userId') || session.user.id;

    if (userIds) {
      const { hydrateUsers } = await import('@/lib/services/user.service');
      const profiles = await hydrateUsers(userIds.split(','));
      return NextResponse.json(profiles);
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const profile = await updateUser(session.user.id, body);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
