
import { NextResponse } from 'next/server';
import { firebaseAdmin, getSiteSettingsAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import type { SiteSettings } from '@/types';
import { rateLimitProfiles, getCallerIp } from '@/lib/rate-limit';

type TestEmailRequestBody = {
    emailSettings: SiteSettings['emailSettings'];
    testTarget: 'default' | 'support' | 'broadcast';
};

export async function POST(request: Request) {
    try {
        const rl = rateLimitProfiles.sensitive(getCallerIp(request) + ':send-test-email');
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait before retrying.' }, {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
            });
        }

        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        
        const adminAuth = firebaseAdmin.auth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        if (decodedToken.role !== 'admin') {
             return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const user = await adminAuth.getUser(decodedToken.uid);
        if (!user.email) {
            return NextResponse.json({ error: 'User does not have an email address.' }, { status: 400 });
        }

        const { emailSettings, testTarget }: TestEmailRequestBody = await request.json();
        const { appName } = await getSiteSettingsAdmin();

        if (!emailSettings || !emailSettings.smtpSettings) {
             return NextResponse.json({ error: 'Bad Request: Missing email settings.' }, { status: 400 });
        }

        const { smtpSettings, fromAddresses } = emailSettings;
        const fromAddress = fromAddresses[testTarget];

        if (!fromAddress) {
             return NextResponse.json({ error: `Bad Request: Missing 'from' address for target '${testTarget}'.`}, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.port === 465, // Use true for 465, false for other ports
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass,
            },
        });

        await transporter.verify();

        const mailOptions = {
            from: fromAddress,
            to: user.email, 
            subject: `${appName} SMTP Test (${testTarget})`,
            text: `This is a test email from your ${appName} application for the '${testTarget}' address. Your SMTP settings are working correctly!`,
            html: `<b>This is a test email from your ${appName} application for the '${testTarget}' address.</b><p>Your SMTP settings are working correctly!</p>`,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Test email sent successfully.' });

    } catch (error) {
        console.error('API Error - /api/send-test-email:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send test email: ${errorMessage}` }, { status: 500 });
    }
}
