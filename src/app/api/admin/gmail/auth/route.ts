import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth.server';

export async function GET(request: Request) {
  try {
    // Basic verification check: OAuth route is only accessible to admins
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return new Response('Unauthorized', { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Dynamic redirect URI depending on local or production app URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
    const redirectUri = `${baseUrl}/api/admin/gmail/callback`;

    if (!clientId || !clientSecret) {
      return new Response('Google OAuth Client credentials not configured in environment variables.', { status: 500 });
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authorizationUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.settings.basic'
      ]
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error: any) {
    console.error('Error generating Gmail OAuth URL:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
