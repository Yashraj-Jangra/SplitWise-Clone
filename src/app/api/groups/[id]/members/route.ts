import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { addMembersToGroup, removeMemberFromGroup } from '@/lib/services/group.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { memberIds } = await request.json();
    if (!memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: 'Invalid memberIds parameter' }, { status: 400 });
    }
    await addMembersToGroup(id, memberIds, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding members to group:', error);
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
    const userIdToRemove = searchParams.get('userId');
    if (!userIdToRemove) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }
    await removeMemberFromGroup(id, userIdToRemove, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member from group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
