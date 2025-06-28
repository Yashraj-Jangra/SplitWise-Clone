import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Forgot Password - ${settings.appName}`,
    description: `Reset your ${settings.appName} password.`,
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
