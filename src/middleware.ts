import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection.
 *
 * Runs on every matched request BEFORE the page renders.
 * Redirects unauthenticated users server-side (no client-side flash).
 *
 * Strategy: Check for the Firebase session cookie set by /api/auth/session.
 * The cookie itself is verified in the API route using the Admin SDK.
 * Here we only check existence to keep middleware on the Edge runtime (fast).
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
    '/auth/verify-email',
    '/(info)',
    '/privacy',
    '/terms',
    '/api/public',      // Public settings endpoint
    '/api/auth',        // Session create/delete
    '/_next',
    '/favicon.ico',
    '/icons',
    '/manifest.json',
    '/sw.js',
  ];

  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // --- Check for session cookie ---
  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
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
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-).*)',
  ],
};
