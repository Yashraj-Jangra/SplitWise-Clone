import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Sign Up - ${settings.appName}`,
    description: settings.authPage?.signupSubtitle,
  };
}

export default async function SignupPage() {
  const settings = await getSiteSettings();
  return <SignupForm authPageSettings={settings.authPage} appName={settings.appName} />;
}
