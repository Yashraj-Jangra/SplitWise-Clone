import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { uploadFile } from '@/lib/storage';
import { verifyGroupMembership } from '@/lib/services/group.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string;

    if (groupId) {
      // Authorization Check: Must be admin or group member
      const isMember = session.user.role === 'admin' || await verifyGroupMembership(groupId, session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: You do not belong to this group' }, { status: 403 });
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF are allowed for receipts.' }, { status: 400 });
    }

    // Limit receipt size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Max limit is 10MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const rawExtension = file.name.split('.').pop() || 'png';
    const fileExtension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const uniqueId = crypto.randomUUID();
    
    // Store in a group-specific folder or generic receipts folder
    const key = groupId 
      ? `groups/${groupId}/receipts/${uniqueId}.${fileExtension}`
      : `receipts/${uniqueId}.${fileExtension}`;

    const relativeUrl = await uploadFile(key, fileBuffer, file.type);

    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
