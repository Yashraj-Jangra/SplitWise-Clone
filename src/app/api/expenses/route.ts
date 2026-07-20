import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getExpensesByGroupId, getExpensesByUserId, addExpense, getAllExpenses } from '@/lib/services/expense.service';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');
    const all = searchParams.get('all');

    if (all === 'true' && session.user.role === 'admin') {
      const expenses = await getAllExpenses();
      return NextResponse.json(expenses);
    }

    if (groupId) {
      // Authorization Check: Must be admin or group member
      const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
      }

      const expenses = await getExpensesByGroupId(groupId);
      return NextResponse.json(expenses);
    }

    const targetUserId = userId || session.user.id;
    // Users can only view their own expenses (unless admin)
    if (targetUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Cannot view another user\'s global expenses' }, { status: 403 });
    }

    const expenses = await getExpensesByUserId(targetUserId);
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    if (!body.groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(body.groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    const expenseData = {
      ...body,
      date: new Date(body.date),
    };
    const expenseId = await addExpense(expenseData, session.user.id);
    return NextResponse.json({ success: true, id: expenseId });
  } catch (error: any) {
    console.error('Error adding expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
