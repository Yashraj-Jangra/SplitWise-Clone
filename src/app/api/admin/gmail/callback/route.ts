import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSiteSettings, updateSiteSettings } from '@/lib/services/settings.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';

    if (errorParam) {
      return NextResponse.redirect(`${baseUrl}/admin/settings/mail?error=gmail_auth_failed&details=${errorParam}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/admin/settings/mail?error=missing_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/admin/gmail/callback`;

    if (!clientId || !clientSecret) {
      return new Response('Google OAuth Client credentials not configured in environment variables.', { status: 500 });
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange auth code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Fetch primary email address of connected user
    const profileResponse = await gmail.users.getProfile({ userId: 'me' });
    const primaryEmail = profileResponse.data.emailAddress || '';

    // Fetch available Send Mail As aliases configured in Gmail
    let aliases: string[] = [];
    try {
      const sendAsResponse = await gmail.users.settings.sendAs.list({ userId: 'me' });
      aliases = (sendAsResponse.data.sendAs || [])
        .map(item => item.sendAsEmail)
        .filter(Boolean) as string[];
    } catch (aliasErr) {
      console.warn('Failed to fetch sending aliases:', aliasErr);
    }

    // Retrieve existing settings
    const settings = await getSiteSettings();
    const emailSettings: any = settings.emailSettings || {};

    const storedRefreshToken = emailSettings?.gmailSettings?.refreshToken;
    const finalRefreshToken = tokens.refresh_token || storedRefreshToken;

    if (!finalRefreshToken) {
      return NextResponse.redirect(`${baseUrl}/admin/settings/mail?error=no_refresh_token`);
    }

    emailSettings.gmailSettings = {
      connectedEmail: primaryEmail,
      refreshToken: finalRefreshToken,
      aliases: aliases.includes(primaryEmail) ? aliases : [primaryEmail, ...aliases],
    };

    // Save back to Oracle Autonomous DB
    await updateSiteSettings({ emailSettings });

    return NextResponse.redirect(`${baseUrl}/admin/settings/mail?success=gmail`);
  } catch (error: any) {
    console.error('Error in Gmail OAuth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
    return NextResponse.redirect(`${baseUrl}/admin/settings/mail?error=callback_error&details=${encodeURIComponent(error.message || '')}`);
  }
}
