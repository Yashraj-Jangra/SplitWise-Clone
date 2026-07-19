import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Bad Request: Email is required.' }, { status: 400 });
        }

        // Trigger Better Auth's native password reset logic
        // It will call our custom sendResetPassword handler defined in auth.server.ts
        await auth.api.requestPasswordReset({
            body: {
                email,
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3235'}/auth/reset-password`,
            },
            headers: request.headers,
        });

        return NextResponse.json({ success: true, message: 'Password reset email sent successfully.' });

    } catch (error: any) {
        console.error('API Error - /api/send-password-reset:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send email: ${errorMessage}` }, { status: 500 });
    }
}
