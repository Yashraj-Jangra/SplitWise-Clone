import { google } from 'googleapis';

export async function sendEmailViaGmail({
  to,
  subject,
  text,
  html,
  fromAddress,
  refreshToken,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromAddress: string;
  refreshToken: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Dynamic fallback URL for local vs production redirect URIs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
  const redirectUri = `${baseUrl}/api/admin/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client credentials not configured in environment variables.');
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  // Construct MIME message
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${fromAddress}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html || text).toString('base64'),
  ];
  const message = messageParts.join('\r\n');

  // Base64URL safe encoding
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
