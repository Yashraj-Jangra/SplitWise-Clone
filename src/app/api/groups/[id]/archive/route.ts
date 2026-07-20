import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { archiveGroup, restoreGroup } from '@/lib/services/group.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
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
    await restoreGroup(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
