import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Login - ${settings.appName}`,
    description: settings.authPage?.loginSubtitle,
  };
}

export default async function LoginPage() {
  const settings = await getSiteSettings();
  return <LoginForm authPageSettings={settings.authPage} appName={settings.appName} />;
}
