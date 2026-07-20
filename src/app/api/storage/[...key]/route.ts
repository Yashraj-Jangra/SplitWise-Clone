import { NextResponse } from 'next/server';
import { s3, BUCKET } from '@/lib/minio';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth.server';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key: keyParts } = await params;
    const key = keyParts.join('/');

    // Security Check: Enforce group membership boundaries on group receipt directories
    if (key.startsWith('groups/')) {
      const parts = key.split('/');
      const groupId = parts[1];
      if (groupId) {
        const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
        if (!isMember) {
          return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
        }
      }
    }

    const response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    if (!response.Body) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const headers = new Headers();
    if (response.ContentType) {
      headers.set('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }
    // Cache for 1 year (immutable) for static media
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Convert the SDK stream to standard Web stream
    const webStream = (response.Body as any).transformToWebStream
      ? (response.Body as any).transformToWebStream()
      : response.Body;

    return new Response(webStream, {
      headers,
    });
  } catch (error) {
    console.error('Error proxying file from MinIO:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

