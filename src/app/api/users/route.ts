import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/services/user.service';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
