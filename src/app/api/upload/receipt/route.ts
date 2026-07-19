import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { uploadFile } from '@/lib/minio';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop() || 'png';
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
