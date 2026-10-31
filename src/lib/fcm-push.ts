import { google } from 'googleapis';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  androidChannelId?: string;
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  unregistered?: boolean;
  error?: string;
}

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Mints or retrieves a cached OAuth 2.0 access token using Firebase service account credentials.
 */
async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60 * 1000) {
    return cachedToken.token;
  }

  try {
    const formattedKey = rawKey.replace(/\\n/g, '\n');
    const jwtClient = new google.auth.JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: SCOPES,
    });

    const tokens = await jwtClient.authorize();
    if (!tokens.access_token) {
      console.error('[FCM] Failed to obtain access token from Google.');
      return null;
    }

    cachedToken = {
      token: tokens.access_token,
      expiresAt: tokens.expiry_date || now + 3600 * 1000,
    };

    return cachedToken.token;
  } catch (err: any) {
    console.error('[FCM] Error authorizing service account JWT:', err?.message || err);
    return null;
  }
}

/**
 * Sends a high-priority push notification directly to an Android device using Google's FCM HTTP v1 API.
 */
export async function sendFcmPush(
  fcmToken: string,
  payload: FcmPayload
): Promise<FcmSendResult> {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'splitit-cvweb';
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      success: false,
      error: 'Firebase service account credentials missing or invalid in server environment.',
    };
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const channelId = payload.androidChannelId || 'default';

  // Construct official FCM HTTP v1 payload
  const fcmMessage = {
    message: {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: channelId,
          sound: 'default',
          color: '#00C4CC',
          notification_priority: 'PRIORITY_MAX',
          default_vibrate_timings: true,
          default_light_settings: true,
        },
      },
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        messageId: data?.name,
      };
    }

    const errorBody = await res.json().catch(() => null);
    const errorCode = errorBody?.error?.details?.[0]?.errorCode || errorBody?.error?.status;
    const isUnregistered =
      errorCode === 'UNREGISTERED' ||
      res.status === 404 ||
      errorBody?.error?.message?.includes('Requested entity was not found');

    if (isUnregistered) {
      return {
        success: false,
        unregistered: true,
        error: 'Device token is unregistered or expired.',
      };
    }

    console.error('[FCM HTTP v1 Error]:', res.status, JSON.stringify(errorBody));
    return {
      success: false,
      error: errorBody?.error?.message || `FCM HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.error('[FCM Dispatch Error]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error delivering to FCM',
    };
  }
}

