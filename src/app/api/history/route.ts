import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getHistoryByGroupId, getHistoryForExpense } from '@/lib/services/history.service';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const expenseId = searchParams.get('expenseId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId parameter is required' }, { status: 400 });
    }

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    if (expenseId) {
      const history = await getHistoryForExpense(expenseId, groupId);
      return NextResponse.json(history);
    }

    const history = await getHistoryByGroupId(groupId);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching history events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
