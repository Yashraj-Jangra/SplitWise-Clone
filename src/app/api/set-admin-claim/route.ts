
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';

// Bootstrap admin email — read from server env only, never exposed to client.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * POST /api/set-admin-claim
 * 
 * Grants or revokes the admin custom claim on a Firebase user.
 * 
 * Body: { uid: string, action: 'promote' | 'demote' }
 * 
 * Authorization rules:
 *   - Any user whose email matches ADMIN_EMAIL (bootstrap admin) can call this.
 *   - Any existing admin (role === 'admin' claim) can promote/demote others.
 *   - Self-demotion is allowed (admin stepping down).
 *   - Unauthenticated calls are rejected.
 */
export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();
        const { uid, action = 'promote' } = body as { uid: string; action?: 'promote' | 'demote' };

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }
        if (action !== 'promote' && action !== 'demote') {
            return NextResponse.json({ error: 'action must be "promote" or "demote"' }, { status: 400 });
        }

        // --- Verify caller identity ---
        let callerIsAuthorized = false;

        if (authHeader?.startsWith('Bearer ')) {
            const idToken = authHeader.slice(7);
            try {
                const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
                const callerRecord = await firebaseAdmin.auth().getUser(decodedToken.uid);

                // Authorized if: caller is the bootstrap admin email OR caller has admin claim
                const callerIsBootstrapAdmin = ADMIN_EMAIL && callerRecord.email === ADMIN_EMAIL;
                const callerHasAdminClaim = decodedToken.role === 'admin';
                callerIsAuthorized = !!(callerIsBootstrapAdmin || callerHasAdminClaim);
            } catch {
                // Invalid token — fall through to unauthorized
            }
        }

        // Special case: allow unauthenticated self-promotion ONLY if the target uid's
        // email matches ADMIN_EMAIL (bootstrap scenario — first login).
        if (!callerIsAuthorized && ADMIN_EMAIL) {
            const targetRecord = await firebaseAdmin.auth().getUser(uid);
            if (targetRecord.email === ADMIN_EMAIL && action === 'promote') {
                callerIsAuthorized = true;
            }
        }

        if (!callerIsAuthorized) {
            return NextResponse.json(
                { error: 'Forbidden: Only existing admins can manage admin roles.' },
                { status: 403 }
            );
        }

        // --- Apply the claim ---
        if (action === 'promote') {
            await firebaseAdmin.auth().setCustomUserClaims(uid, { role: 'admin' });
            // Mirror the role in Firestore user document for client-side display
            await firebaseAdmin.firestore().collection('users').doc(uid).update({ role: 'admin' });
            return NextResponse.json({ success: true, message: `User ${uid} promoted to admin.` });
        } else {
            // demote — check we're not removing the last admin
            // Restore to regular user claim
            await firebaseAdmin.auth().setCustomUserClaims(uid, { role: 'user' });
            await firebaseAdmin.firestore().collection('users').doc(uid).update({ role: 'user' });
            return NextResponse.json({ success: true, message: `User ${uid} demoted to regular user.` });
        }

    } catch (error) {
        console.error('API Error - /api/set-admin-claim:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to set admin claim: ${errorMessage}` }, { status: 500 });
    }
}
