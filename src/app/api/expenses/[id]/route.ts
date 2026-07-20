import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { updateExpense, deleteExpense } from '@/lib/services/expense.service';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
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
    await updateExpense(id, body.oldAmount || body.amount, expenseData, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const amount = parseFloat(searchParams.get('amount') || '0');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId parameter is required' }, { status: 400 });
    }

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    await deleteExpense(id, groupId, amount, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

