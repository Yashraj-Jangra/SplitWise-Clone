
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { uid } = await request.json();
        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        await firebaseAdmin.auth().setCustomUserClaims(uid, { role: 'admin' });

        return NextResponse.json({ success: true, message: `Admin claim set for user ${uid}` });

    } catch (error) {
        console.error('API Error - /api/set-admin-claim:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to set admin claim: ${errorMessage}` }, { status: 500 });
    }
}
