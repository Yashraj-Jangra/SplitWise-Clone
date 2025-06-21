
import type { Metadata } from 'next';
import { EmailConfiguration } from '@/components/admin/email-configuration';
import { EmailManager } from '@/components/admin/email-manager';

export const metadata: Metadata = {
  title: 'Manage Emails - SettleEase Admin',
  description: 'Configure, customize, and send transactional emails.',
};

export default async function ManageEmailsPage() {
  const isEmailServiceConfigured = !!(
    process.env.GMAIL_SENDER_EMAIL &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
  
  const configuredSender = process.env.GMAIL_SENDER_EMAIL || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Manage Emails
        </h1>
        <p className="text-muted-foreground">
          Configure, generate, preview, and send transactional emails to users.
        </p>
      </div>

      <EmailConfiguration 
        isConfigured={isEmailServiceConfigured} 
        configuredSender={configuredSender}
      />

      <EmailManager isConfigured={isEmailServiceConfigured} />
    </div>
  );
}
