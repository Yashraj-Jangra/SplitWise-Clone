
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmailManager } from '@/components/admin/email-manager';

export const metadata: Metadata = {
  title: 'Manage Emails - SettleEase Admin',
  description: 'Customize and send transactional emails.',
};

function EmailConfigurationCard({ isConfigured }: { isConfigured: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Configuration Status</CardTitle>
        <CardDescription>
          Status of the connection to the Gmail API for sending emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConfigured ? (
          <Alert>
            <Icons.ShieldCheck className="h-4 w-4" />
            <AlertTitle>System Ready</AlertTitle>
            <AlertDescription>
              Email service is configured and ready to send emails from{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">
                {process.env.GMAIL_SENDER_EMAIL}
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <Icons.ShieldCheck className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              The email sending service is not configured. Please set the
              `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
              and `GMAIL_SENDER_EMAIL` variables in your `.env` file to enable
              this feature. See the `.env` file for instructions.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ManageEmailsPage() {
  const isEmailServiceConfigured = !!(
    process.env.GMAIL_SENDER_EMAIL &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Manage Emails
        </h1>
        <p className="text-muted-foreground">
          Generate, preview, and send transactional emails to users.
        </p>
      </div>

      <EmailConfigurationCard isConfigured={isEmailServiceConfigured} />

      <EmailManager isConfigured={isEmailServiceConfigured} />
    </div>
  );
}
