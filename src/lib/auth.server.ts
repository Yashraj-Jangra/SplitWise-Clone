import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';
import nodemailer from 'nodemailer';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to false initially for ease of migration
    sendResetPassword: async ({ user, url }) => {
      // Fetch settings from Database
      const settingsDoc = await prisma.settings.findUnique({
        where: { id: 'general' }
      });
      const settings = (settingsDoc?.data as any) || {};
      const emailSettings = settings.emailSettings;
      const appName = settings.appName || 'SplitWise Clone';

      if (emailSettings && emailSettings.smtpSettings) {
        const smtp = emailSettings.smtpSettings;
        const fromAddress = emailSettings.fromAddresses?.auth || emailSettings.fromAddresses?.default || smtp.user;
        
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.pass,
          },
        });

        const resetTemplate = settings.emailTemplates?.forgotPassword || {
          subject: 'Password Reset Request for {appName}',
          body: 'Hi {userName},\n\nYou requested to reset your password. Please click the link below to set a new password:\n{resetLink}\n\nThanks,\nThe {appName} Team'
        };

        const subject = resetTemplate.subject.replace(/\{appName\}/g, appName).replace(/\{userName\}/g, user.name);
        const text = resetTemplate.body
          .replace(/\{appName\}/g, appName)
          .replace(/\{userName\}/g, user.name)
          .replace(/\{resetLink\}/g, url);

        try {
          await transporter.sendMail({
            from: `"${appName}" <${fromAddress}>`,
            to: user.email,
            subject,
            text,
            html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
          });
        } catch (error) {
          console.error('Failed to send password reset email via SMTP:', error);
        }
      } else {
        console.warn('SMTP Settings not configured. Reset link:', url);
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieName: '__session',   // Matches existing middleware configuration
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user' },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      username: { type: 'string', required: false },
      avatarUrl: { type: 'string', required: false },
      countryCode: { type: 'string', required: false },
      mobileNumber: { type: 'string', required: false },
      dob: { type: 'string', required: false },
    },
  },
});
