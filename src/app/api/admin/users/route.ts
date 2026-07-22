import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getAllUsersPaginated, deleteUser, updateUser } from '@/lib/services/user.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '0', 10);

    const result = await getAllUsersPaginated(limit, page);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching admin users list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const singleUserId = searchParams.get('userId');

    let userIdsToDelete: string[] = [];
    if (singleUserId) {
      userIdsToDelete = [singleUserId];
    } else {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.userIds)) {
        userIdsToDelete = body.userIds;
      }
    }

    if (userIdsToDelete.length === 0) {
      return NextResponse.json({ error: 'No user ID(s) provided for deletion.' }, { status: 400 });
    }

    let deletedCount = 0;
    for (const uid of userIdsToDelete) {
      try {
        await deleteUser(uid);
        deletedCount++;
      } catch (e: any) {
        console.warn(`Could not delete user ${uid}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error: any) {
    console.error('Error deleting user(s):', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user(s)' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, role } = body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Valid userIds array and role are required.' }, { status: 400 });
    }

    let updatedCount = 0;
    for (const uid of userIds) {
      try {
        await updateUser(uid, { role });
        updatedCount++;
      } catch (e: any) {
        console.warn(`Could not update role for user ${uid}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    console.error('Error updating user role(s):', error);
    return NextResponse.json({ error: error.message || 'Failed to update user role(s)' }, { status: 500 });
  }
}
