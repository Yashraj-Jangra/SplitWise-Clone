
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';
// 14 days in seconds
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

/**
 * POST /api/auth/session
 * Creates a session cookie from a Firebase ID token.
 * Called client-side after every successful login.
 *
 * Body: { idToken: string }
 */
export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();

        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
        }

        // We store the raw ID token as the session value.
        // The middleware checks for its existence (fast edge check).
        // Individual API routes that need full verification call verifyIdToken().
        // Firebase ID tokens expire in 1 hour — the client refreshes them automatically
        // via onAuthStateChanged, and calls this endpoint again to refresh the cookie.
        const response = NextResponse.json({ success: true });

        response.cookies.set(SESSION_COOKIE_NAME, idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION_SECONDS,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('API Error - POST /api/auth/session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie on logout.
 */
export async function DELETE() {
    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Immediately expire
        path: '/',
    });

    return response;
}
