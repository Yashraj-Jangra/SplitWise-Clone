
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { getSiteSettings } from '@/lib/mock-data';
import nodemailer from 'nodemailer';
import { getFullName } from '@/lib/utils';
import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Using client-side db for this query is fine

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Bad Request: Email is required.' }, { status: 400 });
        }

        const siteSettings = await getSiteSettings();
        if (siteSettings.emailSettings?.sendingMethod === 'firebase') {
             // Fallback to firebase default if that is the setting.
             const link = await firebaseAdmin.auth().generatePasswordResetLink(email);
             // Note: This doesn't send an email, just generates a link. For full fallback, you'd need more logic.
             // For now, we proceed with custom sending if configured.
             return NextResponse.json({ success: false, error: 'Password reset via default firebase method is not fully implemented here. Please configure a custom SMTP server.' }, {status: 501});
        }
        
        // Find user by email to get their name
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        
        let userName = 'User';
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            userName = getFullName(userData.firstName, userData.lastName);
        }

        const link = await firebaseAdmin.auth().generatePasswordResetLink(email);

        const { emailTemplates, emailSettings, appName } = siteSettings;
        const template = emailTemplates?.forgotPassword;

        if (!template || !emailSettings || (emailSettings.sendingMethod !== 'custom' && emailSettings.sendingMethod !== 'gmail')) {
            return NextResponse.json({ error: 'Mail settings or templates are not configured for custom sending.' }, { status: 500 });
        }
        
        let subject = template.subject.replace(/{appName}/g, appName).replace(/{userName}/g, userName);
        let body = template.body.replace(/{appName}/g, appName).replace(/{userName}/g, userName).replace(/{resetLink}/g, link);

        const { smtpSettings, fromEmail } = emailSettings;
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.port === 465,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass,
            },
        });
        
        await transporter.verify();

        const mailOptions = {
            from: fromEmail,
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
