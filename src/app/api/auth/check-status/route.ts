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
    
    // 3. Determine if a password reset is required:
    //    a) No credential account at all (Google-only or migrated without password), OR
    //    b) Credential account exists but has no valid password hash (failed migration)
    const hasCredentialAccount = gsiCred.length > 0;
    const hasValidPasswordHash = hasCredentialAccount && 
      gsiCred[0]?.password && 
      typeof gsiCred[0].password === 'string' && 
      gsiCred[0].password.length > 20; // any real bcrypt/argon2 hash is well above 20 chars

    const requiresReset = !hasValidPasswordHash;

    return NextResponse.json({
      exists: true,
      requiresReset,
      // Surface whether they have Google linked so the UI can hint "try Google instead"
      hasGoogleAccount: (await queryByGsi<any>(`ACCOUNT#google#${user.id}`)).length > 0,
    });
  } catch (error: any) {
    console.error('Error checking user auth status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
