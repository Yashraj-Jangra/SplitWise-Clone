
'use server';

import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { z } from 'zod';

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
});

export async function sendEmailAction(input: z.infer<typeof sendEmailSchema>) {
  const validation = sendEmailSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input.' };
  }

  const { to, subject, html } = validation.data;

  const {
    GMAIL_SENDER_EMAIL,
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
  } = process.env;

  if (
    !GMAIL_SENDER_EMAIL ||
    !GMAIL_CLIENT_ID ||
    !GMAIL_CLIENT_SECRET ||
    !GMAIL_REFRESH_TOKEN
  ) {
    console.error('Missing Gmail API credentials in .env file');
    return {
      success: false,
      error:
        'Email sending is not configured on the server. Missing Gmail API credentials.',
    };
  }

  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URL
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
  });

  try {
    const accessToken = await oauth2Client.getAccessToken();
    if (!accessToken.token) {
        throw new Error("Failed to create access token.");
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_SENDER_EMAIL,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `SettleEase <${GMAIL_SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: `Email sent successfully to ${to}` };
  } catch (error) {
    console.error('Failed to send email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to send email. Reason: ${errorMessage}` };
  }
}


const verifyCredentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required.'),
  clientSecret: z.string().min(1, 'Client Secret is required.'),
  refreshToken: z.string().min(1, 'Refresh Token is required.'),
});

export async function verifyGoogleCredentialsAction(input: z.infer<typeof verifyCredentialsSchema>) {
  const validation = verifyCredentialsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input. All fields are required.' };
  }
  const { clientId, clientSecret, refreshToken } = validation.data;

  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground' // This is fine for server-side
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to retrieve access token. Please check your credentials and consent.");
    }
    // If we get a token, the credentials are valid.
    return { success: true, message: 'Credentials are valid! You can now send emails.' };
  } catch (error) {
    console.error('Failed to verify credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Verification failed. Reason: ${errorMessage}` };
  }
}
