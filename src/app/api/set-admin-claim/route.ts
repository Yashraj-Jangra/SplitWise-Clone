import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';
import { rateLimitProfiles, getCallerIp } from '@/lib/rate-limit';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: Request) {
  try {
    const rl = rateLimitProfiles.sensitive(getCallerIp(request) + ':set-admin-claim');
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      });
    }

    const body = await request.json();
    const { uid, action = 'promote' } = body as { uid: string; action?: 'promote' | 'demote' };

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }
    if (action !== 'promote' && action !== 'demote') {
      return NextResponse.json({ error: 'action must be "promote" or "demote"' }, { status: 400 });
    }

    // --- Verify caller identity via Better Auth session ---
    const session = await auth.api.getSession({ headers: request.headers });
    let callerIsAuthorized = false;

    if (session?.user) {
      const callerRecord = session.user;
      const callerIsBootstrapAdmin = ADMIN_EMAIL && callerRecord.email === ADMIN_EMAIL;
      const callerHasAdminClaim = callerRecord.role === 'admin';
      callerIsAuthorized = !!(callerIsBootstrapAdmin || callerHasAdminClaim);
    }

    // Special case: allow unauthenticated self-promotion ONLY if the target uid's
    // email matches ADMIN_EMAIL (bootstrap scenario — first login).
    if (!callerIsAuthorized && ADMIN_EMAIL) {
      const targetRecord = await prisma.user.findUnique({ where: { id: uid } });
      if (targetRecord && targetRecord.email === ADMIN_EMAIL && action === 'promote') {
        callerIsAuthorized = true;
      }
    }

    if (!callerIsAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only existing admins can manage admin roles.' },
        { status: 403 }
      );
    }

    const targetRole = action === 'promote' ? 'admin' : 'user';
    await prisma.user.update({
      where: { id: uid },
      data: { role: targetRole }
    });

    return NextResponse.json({
      success: true,
      message: `User ${uid} role updated to ${targetRole}.`
    });

  } catch (error) {
    console.error('API Error - /api/set-admin-claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: `Failed to set admin claim: ${errorMessage}` }, { status: 500 });
  }
}
