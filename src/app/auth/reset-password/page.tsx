import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';
import { Loader2 } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Reset Password - ${settings.appName}`,
    description: 'Set a new password for your account',
  };
}

function ResetPasswordFallback() {
  return (
    <div
      className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm flex flex-col items-center justify-center min-h-[300px]"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-xs text-muted-foreground">Loading password reset form...</p>
    </div>
  );
}

export default async function ResetPasswordPage() {
  const settings = await getSiteSettings();

  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm
        authPageSettings={settings.authPage}
        appName={settings.appName || 'SplitIt'}
      />
    </Suspense>
  );
}
