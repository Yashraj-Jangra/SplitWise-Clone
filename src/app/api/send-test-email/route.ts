
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    initializeAdminApp();
    const auth = getAuth();

    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let decodedToken: admin.auth.DecodedIdToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        const user = await auth.getUser(decodedToken.uid);

        if (user.customClaims?.['role'] !== 'admin') {
             return NextResponse.json({ error: 'Forbidden: User is not an admin' }, { status: 403 });
        }

        const emailSettings = await request.json();

        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpSettings.host,
            port: emailSettings.smtpSettings.port,
            secure: emailSettings.smtpSettings.secure,
            auth: {
                user: emailSettings.smtpSettings.user,
                pass: emailSettings.smtpSettings.pass,
            },
        });

        await transporter.verify();

        const mailOptions = {
            from: emailSettings.fromEmail,
            to: user.email, 
            subject: 'SettleEase SMTP Test',
            text: 'This is a test email from your SettleEase application. Your SMTP settings are working correctly!',
            html: '<b>This is a test email from your SettleEase application.</b><p>Your SMTP settings are working correctly!</p>',
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Test email sent successfully.' });

    } catch (error) {
        console.error('Error sending test email:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to send test email: ${errorMessage}` }, { status: 500 });
    }
}
