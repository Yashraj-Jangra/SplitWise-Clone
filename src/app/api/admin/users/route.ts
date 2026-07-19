import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getAllUsersPaginated } from '@/lib/services/user.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '0', 10);

    const result = await getAllUsersPaginated(limit, page);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching admin users list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
