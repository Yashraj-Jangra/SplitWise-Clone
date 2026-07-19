import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { updateExpense, deleteExpense } from '@/lib/services/expense.service';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const expenseData = {
      ...body,
      date: new Date(body.date),
    };
    await updateExpense(params.id, body.oldAmount || body.amount, expenseData, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const amount = parseFloat(searchParams.get('amount') || '0');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId parameter is required' }, { status: 400 });
    }

    await deleteExpense(params.id, groupId, amount, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
