import { AuthCard } from "@/components/auth/auth-card";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/api.client';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Login - ${settings.appName}`,
    description: settings.authPage?.loginSubtitle,
  };
}

export default async function LoginPage() {
  const settings = await getSiteSettings();
  return (
    <AuthCard
      initialMode="login"
      authPageSettings={settings.authPage}
      appName={settings.appName}
    />
  );
}
