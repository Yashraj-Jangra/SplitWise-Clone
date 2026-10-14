import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection.
 *
 * Runs on every matched request BEFORE the page renders.
 * Redirects unauthenticated users server-side (no client-side flash).
 *
 * Strategy: Check for the Better Auth session cookie set by Better Auth (`__session`).
 * Full token verification happens in API routes and server components.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Public paths that never require auth ---
  const publicPaths = [
    '/landing',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/(info)',
    '/privacy',
    '/terms',
    '/api/public',              // Public settings endpoint
    '/api/auth',                // Better Auth endpoints & session
    '/api/send-password-reset', // Password reset request endpoint
    '/_next',
    '/favicon.ico',
    '/icons',
    '/manifest.json',
    '/sw.js',
    '/sw-push.js',
  ];

  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // --- Check for session cookie or Bearer token ---
  const authHeader = request.headers.get('authorization');
  const hasBearerToken = authHeader?.startsWith('Bearer ');
  const sessionCookie = 
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value ||
    request.cookies.get('__session')?.value;

  if (!sessionCookie && !hasBearerToken) {
    // If it's an API route, return 401 JSON instead of an HTML redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // No session — redirect to login, preserving the intended destination
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|sw-push.js|workbox-).*)',
  ],
};
