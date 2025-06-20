import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - SettleEase',
  description: 'Create a SettleEase account to manage group expenses.',
};

export default function SignupPage() {
  return <SignupForm />;
