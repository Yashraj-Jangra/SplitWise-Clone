import { AuthCard } from "@/components/auth/auth-card";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/api.client';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Sign Up - ${settings.appName}`,
    description: settings.authPage?.signupSubtitle,
  };
}

export default async function SignupPage() {
  const settings = await getSiteSettings();
  return (
    <AuthCard
      initialMode="signup"
      authPageSettings={settings.authPage}
      appName={settings.appName}
    />
  );
}
