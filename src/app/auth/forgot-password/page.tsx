import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password - SettleEase',
  description: 'Reset your SettleEase password.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
