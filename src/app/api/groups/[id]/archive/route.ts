import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { archiveGroup, restoreGroup, getGroupById } from '@/lib/services/group.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Authorization Check: Must be admin or the group creator
    const isAuthorized = session.user.role === 'admin' || group.createdBy.uid === session.user.id;
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Only the group creator or an administrator can archive this group' }, { status: 403 });
    }

    await archiveGroup(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error archiving group:', error);
    const isClientError = error.message?.includes('unsettled balances') || error.message?.includes('settle all balances');
    return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Authorization Check: Must be admin or the group creator
    const isAuthorized = session.user.role === 'admin' || group.createdBy.uid === session.user.id;
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Only the group creator or an administrator can restore this group' }, { status: 403 });
    }

    await restoreGroup(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
