import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getSettlementById, updateSettlement, deleteSettlement } from '@/lib/services/settlement.service';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId') || undefined;

    const settlement = await getSettlementById(id, groupId);
    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const targetGroupId = settlement.groupId || groupId;
    if (targetGroupId) {
      const isMember = session.user.role === 'admin' || await verifyGroupMembership(targetGroupId, session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
      }
    }

    return NextResponse.json(settlement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    let targetGroupId = body.groupId;
    if (!targetGroupId) {
      const existing = await getSettlementById(id);
      targetGroupId = existing?.groupId;
    }

    if (!targetGroupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(targetGroupId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    const parsedDate = body.date ? new Date(body.date) : new Date();
    const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const settlementData = {
      ...body,
      groupId: targetGroupId,
      date,
    };
    await updateSettlement(id, settlementData, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settlement:', error);
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
    let groupId = searchParams.get('groupId');

    if (!groupId) {
      const existing = await getSettlementById(id);
      groupId = existing?.groupId || null;
    }

    if (!groupId) {
      return NextResponse.json({ error: 'groupId parameter is required' }, { status: 400 });
    }

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    await deleteSettlement(id, groupId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting settlement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

