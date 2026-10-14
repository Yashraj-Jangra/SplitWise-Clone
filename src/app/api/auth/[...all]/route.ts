import { auth } from '@/lib/auth.server';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

const betterAuthHandlers = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // 1. Support GET /api/auth/sign-in/social for mobile webview / openAuthSessionAsync
  if (url.pathname.endsWith('/sign-in/social')) {
    const provider = (url.searchParams.get('provider') || 'google') as any;
    const callbackURL = url.searchParams.get('callbackURL') || '/dashboard';

    try {
      const result = await auth.api.signInSocial({
        body: {
          provider,
          callbackURL,
        },
      });
      if (result?.url) {
        return NextResponse.redirect(result.url);
      }
    } catch (err: any) {
      console.error('Error initiating social sign in GET:', err);
      return NextResponse.json(
        { error: err?.message || 'Failed to initiate social login' },
        { status: 500 }
      );
    }
  }

  // 2. Delegate to standard Better Auth handler
  const response = await betterAuthHandlers.GET(request);

  // 3. For OAuth callbacks redirecting to mobile schemes (exp:// or splitit://),
  // append the session token to the redirect URL query params so mobile can capture it!
  const location = response.headers.get('location');
  if (location && (location.startsWith('exp://') || location.startsWith('splitit://'))) {
    const setCookie = response.headers.get('set-cookie');
    const setAuthToken = response.headers.get('set-auth-token');

    let sessionToken = setAuthToken || '';
    if (!sessionToken && setCookie) {
      const match = setCookie.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
      if (match && match[1]) {
        sessionToken = decodeURIComponent(match[1]);
      }
    }

    if (sessionToken) {
      try {
        const redirectUrl = new URL(location);
        redirectUrl.searchParams.set('token', sessionToken);
        redirectUrl.searchParams.set('session_token', sessionToken);

        const newHeaders = new Headers(response.headers);
        newHeaders.set('location', redirectUrl.toString());

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (err) {
        console.error('Failed to append token to mobile redirect location:', err);
      }
    }
  }

  return response;
}

export const POST = betterAuthHandlers.POST;

