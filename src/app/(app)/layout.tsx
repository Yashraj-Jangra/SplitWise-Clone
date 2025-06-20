import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SettleEase App', // Will be overridden by specific pages
  description: 'Manage your group expenses.',
};

// This layout will apply to all routes within the (app) group
export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The pageTitle prop for AppShell can be set dynamically by child pages
  // or a default can be provided here. For now, child pages will handle it.
  return <AppShell>{children}</AppShell