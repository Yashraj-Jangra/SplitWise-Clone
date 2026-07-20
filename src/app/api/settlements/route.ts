import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getSettlementsByGroupId, getSettlementsByUserId, addSettlement, getAllSettlements } from '@/lib/services/settlement.service';
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
      const settlements = await getAllSettlements();
      return NextResponse.json(settlements);
    }

    if (groupId) {
      // Authorization Check: Must be admin or group member
      const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
      }

      const settlements = await getSettlementsByGroupId(groupId);
      return NextResponse.json(settlements);
    }

    const targetUserId = userId || session.user.id;
    // Users can only view their own settlements (unless admin)
    if (targetUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Cannot view another user\'s global settlements' }, { status: 403 });
    }

    const settlements = await getSettlementsByUserId(targetUserId);
    return NextResponse.json(settlements);
  } catch (error: any) {
    console.error('Error fetching settlements:', error);
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

    const settlementData = {
      ...body,
      date: new Date(body.date),
    };
    const settlementId = await addSettlement(settlementData, session.user.id);
    return NextResponse.json({ success: true, id: settlementId });
  } catch (error: any) {
    console.error('Error adding settlement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
