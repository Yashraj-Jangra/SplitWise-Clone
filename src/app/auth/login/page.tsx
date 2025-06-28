import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Login - ${settings.appName}`,
    description: `Log in to your ${settings.appName} account to manage group expenses.`,
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
