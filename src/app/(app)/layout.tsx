
import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from 'next';
import { getSiteSettings } from "@/lib/mock-data";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.appName} App`,
    description: `Manage your group expenses on ${settings.appName}.`,
  };
}


// This layout will apply to all routes within the (app) group
export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The pageTitle prop for AppShell can be set dynamically by child pages
  // or a default can be provided here. For now, child pages will handle it.
  return (
    <AppShell>{children}</AppShell>
  );
}
