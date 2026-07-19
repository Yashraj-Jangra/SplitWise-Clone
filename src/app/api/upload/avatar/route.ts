import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.' }, { status: 400 });
    }

    // Limit avatar size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Max limit is 5MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop() || 'png';
    const key = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    const relativeUrl = await uploadFile(key, fileBuffer, file.type);

    // Update user profile in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: relativeUrl,
        image: relativeUrl
      }
    });

    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
