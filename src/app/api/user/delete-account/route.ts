import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { deleteItem, queryByEntityType } from '@/lib/nosql';

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = session.user.id;

    // Delete User Profile
    await deleteItem(`USER#${uid}`, 'PROFILE');

    // Clean up Sessions and Accounts for this user
    const sessions = await queryByEntityType<any>('SESSION');
    for (const s of sessions) {
      if (s.userId === uid) {
        await deleteItem(`USER#${uid}`, `SESSION#${s.id}`);
      }
    }

    const accounts = await queryByEntityType<any>('ACCOUNT');
    for (const a of accounts) {
      if (a.userId === uid) {
        await deleteItem(`USER#${uid}`, `ACCOUNT#${a.providerId}#${a.accountId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user/delete-account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
