import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nosqlAuthAdapter } from './nosql-auth-adapter';
import { getSiteSettings } from './services/settings.service';
import nodemailer from 'nodemailer';
import { sendEmailViaGmail } from './gmail-sender';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231',
  database: nosqlAuthAdapter(),
  plugins: [
    admin(),
  ],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        const settings = await getSiteSettings();
        const emailSettings: any = settings.emailSettings || {};
        const appName = settings.appName || 'SplitIt';

        const resetTemplate = (settings as any).emailTemplates?.forgotPassword || {
          subject: 'Password Reset Request for {appName}',
          body: 'Hi {userName},\n\nYou requested to reset your password. Please click the link below to set a new password:\n{resetLink}\n\nThanks,\nThe {appName} Team'
        };

        const subject = resetTemplate.subject.replace(/\{appName\}/g, appName).replace(/\{userName\}/g, user.name);
        const text = resetTemplate.body
          .replace(/\{appName\}/g, appName)
          .replace(/\{userName\}/g, user.name)
          .replace(/\{resetLink\}/g, url);
        const html = `<p>${text.replace(/\n/g, '<br>')}</p>`;

        if (emailSettings.sendingMethod === 'gmail' && (emailSettings as any).gmailSettings?.refreshToken) {
          const fromAddress = emailSettings.fromAddresses?.auth || emailSettings.fromAddresses?.default || (emailSettings as any).gmailSettings.connectedEmail;
          await sendEmailViaGmail({
            to: user.email,
            subject,
            text,
            html,
            fromAddress,
            refreshToken: (emailSettings as any).gmailSettings.refreshToken
          });
        } else if (emailSettings.smtpSettings?.host) {
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

          await transporter.sendMail({
            from: `"${appName}" <${fromAddress}>`,
            to: user.email,
            subject,
            text,
            html,
          });
        } else {
          console.warn('Mail Settings not configured. Reset link:', url);
        }
      } catch (error) {
        console.error('Failed to send reset password email:', error);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const settings = await getSiteSettings();
        const emailSettings: any = settings.emailSettings || {};
        const appName = settings.appName || 'SplitIt';

        const template = (settings as any).emailTemplates?.registration || {
          subject: 'Welcome to {appName} - Verify Your Email',
          body: 'Hi {userName},\n\nThank you for registering. Please verify your email address by clicking the link below:\n{verificationLink}\n\nThanks,\nThe {appName} Team'
        };

        const subject = template.subject.replace(/\{appName\}/g, appName).replace(/\{userName\}/g, user.name);
        const text = template.body
          .replace(/\{appName\}/g, appName)
          .replace(/\{userName\}/g, user.name)
          .replace(/\{verificationLink\}/g, url);
        const html = `<p>${text.replace(/\n/g, '<br>')}</p>`;

        if (emailSettings.sendingMethod === 'gmail' && (emailSettings as any).gmailSettings?.refreshToken) {
          const fromAddress = emailSettings.fromAddresses?.auth || emailSettings.fromAddresses?.default || (emailSettings as any).gmailSettings.connectedEmail;
          await sendEmailViaGmail({
            to: user.email,
            subject,
            text,
            html,
            fromAddress,
            refreshToken: (emailSettings as any).gmailSettings.refreshToken
          });
        } else if (emailSettings.smtpSettings?.host) {
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

          await transporter.sendMail({
            from: `"${appName}" <${fromAddress}>`,
            to: user.email,
            subject,
            text,
            html,
          });
        }
      } catch (error) {
        console.error('Failed to send verification email:', error);
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              emailVerified: true
            }
          };
        }
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
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
