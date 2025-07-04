
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';
import { getSiteSettings } from '@/lib/mock-data';
import { SiteSettingsProvider } from '@/contexts/site-settings-context';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.appName} - Effortless Group Expense Management`,
    description: `Simplify group expenses with ${settings.appName}. Track, split, and settle shared costs with ease.`,
    icons: {
      icon: settings.faviconUrl || '/favicon.ico',
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background" suppressHydrationWarning>
        <SiteSettingsProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SiteSettingsProvider>
        <Toaster />
      </body>
    </html>
  );
}
