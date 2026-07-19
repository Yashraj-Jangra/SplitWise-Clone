import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getGroupsByUserId, createGroup } from '@/lib/services/group.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const groups = await getGroupsByUserId(session.user.id);
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Error listing groups:', error);
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
    const groupId = await createGroup({
      ...body,
      createdById: session.user.id,
    });
    return NextResponse.json({ success: true, id: groupId });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
