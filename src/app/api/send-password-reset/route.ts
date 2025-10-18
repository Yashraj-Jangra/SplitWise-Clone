
import { NextResponse } from 'next/server';
import { firebaseAdmin, getSiteSettingsAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { getFullName } from '@/lib/utils';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Bad Request: Email is required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettingsAdmin();
        const db = firebaseAdmin.firestore();
        
        // Find user by email to get their name, using the Admin SDK
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).limit(1);
        const querySnapshot = await q.get();
        
        let userName = 'User';
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            userName = getFullName(userData.firstName, userData.lastName);
        }

        const { emailTemplates, emailSettings, appName } = siteSettings;

        // If custom SMTP is not configured, use Firebase's built-in email sender
        if (!emailSettings || (emailSettings.sendingMethod !== 'custom' && emailSettings.sendingMethod !== 'gmail')) {
            await getAuth(firebaseAdmin).generatePasswordResetLink(email);
            return NextResponse.json({ success: true, message: 'Password reset email sent successfully via Firebase.' });
        }
        
        // If using custom SMTP
        const link = await getAuth(firebaseAdmin).generatePasswordResetLink(email);
        const template = emailTemplates?.forgotPassword;

        if (!template) {
             return NextResponse.json({ error: 'Forgot password email template is not configured.' }, { status: 500 });
        }
        
        let subject = template.subject.replace(/{appName}/g, appName).replace(/{userName}/g, userName);
        let body = template.body.replace(/{appName}/g, appName).replace(/{userName}/g, userName).replace(/{resetLink}/g, link);

        const { smtpSettings, fromAddresses } = emailSettings;
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
            from: fromAddresses.default,
            to: email, 
            subject: subject,
            text: body, // Basic text version
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`, // Simple HTML version
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Password reset email sent successfully.' });

    } catch (error) {
        console.error('API Error - /api/send-password-reset:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ error: `Failed to send email: ${errorMessage}` }, { status: 500 });
    }
}
