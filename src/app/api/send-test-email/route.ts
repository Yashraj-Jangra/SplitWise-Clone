
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin'; // Import the initialized admin app
import nodemailer from 'nodemailer';
import type { SiteSettings } from '@/types';

export async function POST(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        
        const adminAuth = firebaseAdmin.auth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        const user = await adminAuth.getUser(decodedToken.uid);

        if (user.customClaims?.['role'] !== 'admin') {
             return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const emailSettings: SiteSettings['emailSettings'] = await request.json();

        if (!emailSettings || !emailSettings.smtpSettings) {
             return NextResponse.json({ error: 'Bad Request: Missing email settings.' }, { status: 400 });
        }

        const { smtpSettings, fromEmail } = emailSettings;

        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass,
            },
        });

        // Verify connection configuration
        await transporter.verify();

        const mailOptions = {
            from: fromEmail,
            to: user.email, 
            subject: 'SettleEase SMTP Test',
            text: 'This is a test email from your SettleEase application. Your SMTP settings are working correctly!',
            html: '<b>This is a test email from your SettleEase application.</b><p>Your SMTP settings are working correctly!</p>',
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Test email sent successfully.' });

    } catch (error) {
        console.error('API Error - /api/send-test-email:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        // Ensure a JSON response is always sent, even on failure
        return NextResponse.json({ error: `Failed to send test email: ${errorMessage}` }, { status: 500 });
    }
}
