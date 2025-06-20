import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - SettleEase',
  description: 'Log in to your SettleEase account to manage group expenses.',
};

export default function LoginPage() {
  return <LoginForm />;
}
