import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Sign Up - ${settings.appName}`,
    description: `Create a ${settings.appName} account to manage group expenses.`,
  };
}

export default function SignupPage() {
  return <SignupForm />;
}
