import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { serverDispatchNotification } from '@/lib/services/dispatch.service';
import type { NotificationEventType } from '@/types';

/**
 * POST /api/notifications/send
 *
 * Client-triggered notification dispatch (e.g. "Remind to settle" button).
 * Server-to-server calls now go through serverDispatchNotification() directly
 * in dispatch.service.ts — no loopback HTTP needed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = !!(
      internalSecret &&
      process.env.INTERNAL_API_SECRET &&
      internalSecret === process.env.INTERNAL_API_SECRET
    );

    let authUid: string;
    if (isInternal) {
      authUid = body.actorId || 'system';
    } else {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
      }
      authUid = session.user.id;
    }

    const {
      type,
      recipientIds,
      title,
      body: notifBody,
      actorId,
      groupId,
      expenseId,
      settlementId,
      target = 'specific_users',
      imageUrl,
      balanceAmount,
      groupName,
      upiUrl,
      actionUrl,
      forceEmail,
      amount,
      description,
    } = body as {
      type: NotificationEventType;
      recipientIds: string[];
      title: string;
      body: string;
      actorId?: string;
      groupId?: string;
      expenseId?: string;
      settlementId?: string;
      target?: 'all_users' | 'specific_users' | 'group';
      imageUrl?: string;
      balanceAmount?: string;
      groupName?: string;
      upiUrl?: string;
      actionUrl?: string;
      forceEmail?: boolean;
      amount?: number;
      description?: string;
    };

    if (!type || !title || !notifBody || !recipientIds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await serverDispatchNotification({
      type,
      recipientIds,
      title,
      body: notifBody,
      actorId,
      groupId,
      expenseId,
      settlementId,
      target,
      imageUrl,
      balanceAmount,
      groupName,
      upiUrl,
      actionUrl,
      forceEmail,
      amount,
      description,
      authUid,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Dispatch failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notificationId: result.notificationId });
  } catch (error: any) {
    console.error('Error in /api/notifications/send:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
