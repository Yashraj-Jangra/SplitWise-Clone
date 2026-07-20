import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { archiveGroup, restoreGroup, verifyGroupMembership } from '@/lib/services/group.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(id, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    await archiveGroup(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error archiving group:', error);
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

    // Authorization Check: Must be admin or group member
    const isMember = session.user.role === 'admin' || await verifyGroupMembership(id, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
    }

    await restoreGroup(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
