import { NextResponse } from 'next/server';
import { isUsernameTaken } from '@/lib/services/user.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const excludeId = searchParams.get('excludeId') || undefined;

    if (!username) {
      return NextResponse.json({ error: 'username parameter is required' }, { status: 400 });
    }

    const taken = await isUsernameTaken(username, excludeId);
    return NextResponse.json({ taken });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
