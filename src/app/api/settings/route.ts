import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getSiteSettings, updateSiteSettings } from '@/lib/services/settings.service';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error getting full settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    await updateSiteSettings(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating site settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
