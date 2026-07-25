import { NextResponse } from 'next/server';
import { queryByGsi } from '@/lib/nosql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email parameter is required' }, { status: 400 });
    }

    const emailVal = email.toLowerCase().trim();
    
    // 1. Query for the user by email GSI
    const userRes = await queryByGsi<any>(`EMAIL#${emailVal}`);
    if (userRes.length === 0) {
      return NextResponse.json({ exists: false, requiresReset: false });
    }

    const user = userRes[0];

    // 2. Query for a credentials account linked to this user
    const gsiCred = await queryByGsi<any>(`ACCOUNT#credential#${user.id}`);
    
    // If user exists, but has no linked credentials (password hash), they need to reset password
    const requiresReset = gsiCred.length === 0;

    return NextResponse.json({
      exists: true,
      requiresReset,
    });
  } catch (error: any) {
    console.error('Error checking user auth status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
