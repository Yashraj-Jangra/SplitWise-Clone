import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getGroupBalances } from '@/lib/services/balance.service';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const balances = await getGroupBalances(params.id);
    return NextResponse.json(balances);
  } catch (error: any) {
    console.error('Error fetching group balances:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
