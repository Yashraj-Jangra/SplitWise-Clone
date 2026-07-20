import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';
import nodemailer from 'nodemailer';
import { sendEmailViaGmail } from './gmail-sender';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        const settingsDoc = await prisma.settings.findUnique({
          where: { id: 'general' }
        });
        const settings = (settingsDoc?.data as any) || {};
        const emailSettings = settings.emailSettings || {};
        const appName = settings.appName || 'SplitWise Clone';

        const resetTemplate = settings.emailTemplates?.forgotPassword || {
          subject: 'Password Reset Request for {appName}',
          body: 'Hi {userName},\n\nYou requested to reset your password. Please click the link below to set a new password:\n{resetLink}\n\nThanks,\nThe {appName} Team'
        };

        const subject = resetTemplate.subject.replace(/\{appName\}/g, appName).replace(/\{userName\}/g, user.name);
        const text = resetTemplate.body
          .replace(/\{appName\}/g, appName)
          .replace(/\{userName\}/g, user.name)
          .replace(/\{resetLink\}/g, url);
        const html = `<p>${text.replace(/\n/g, '<br>')}</p>`;

        if (emailSettings.sendingMethod === 'gmail' && emailSettings.gmailSettings?.refreshToken) {
          const fromAddress = emailSettings.fromAddresses?.auth || emailSettings.fromAddresses?.default || emailSettings.gmailSettings.connectedEmail;
          await sendEmailViaGmail({
            to: user.email,
            subject,
            text,
            html,
            fromAddress,
            refreshToken: emailSettings.gmailSettings.refreshToken
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
        const settingsDoc = await prisma.settings.findUnique({
          where: { id: 'general' }
        });
        const settings = (settingsDoc?.data as any) || {};
        const emailSettings = settings.emailSettings || {};
        const appName = settings.appName || 'SplitWise Clone';

        const template = settings.emailTemplates?.registration || {
          subject: 'Welcome to {appName} - Verify Your Email',
          body: 'Hi {userName},\n\nThank you for registering. Please verify your email address by clicking the link below:\n{verificationLink}\n\nThanks,\nThe {appName} Team'
        };

        const subject = template.subject.replace(/\{appName\}/g, appName).replace(/\{userName\}/g, user.name);
        const text = template.body
          .replace(/\{appName\}/g, appName)
          .replace(/\{userName\}/g, user.name)
          .replace(/\{verificationLink\}/g, url);
        const html = `<p>${text.replace(/\n/g, '<br>')}</p>`;

        if (emailSettings.sendingMethod === 'gmail' && emailSettings.gmailSettings?.refreshToken) {
          const fromAddress = emailSettings.fromAddresses?.auth || emailSettings.fromAddresses?.default || emailSettings.gmailSettings.connectedEmail;
          await sendEmailViaGmail({
            to: user.email,
            subject,
            text,
            html,
            fromAddress,
            refreshToken: emailSettings.gmailSettings.refreshToken
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
          try {
            const settingsDoc = await prisma.settings.findUnique({
              where: { id: 'general' }
            });
            if (!settingsDoc) return;
            const settings = settingsDoc.data as any;
            const emailSettings = settings?.emailSettings;
            const smtpConfigured = !!(emailSettings?.smtpSettings?.host && emailSettings?.smtpSettings?.user);
            const requireOtp = settings?.securitySettings?.requireOtpVerification ?? false;
            
            if (!smtpConfigured || !requireOtp) {
              return {
                data: {
                  ...user,
                  emailVerified: true
                }
              };
            }
          } catch (e) {
            console.error('Error in databaseHook user.create.before:', e);
          }
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
  cookies: {
    session: {
      name: '__session',
    }
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
