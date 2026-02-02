
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';
import { getSiteSettings } from '@/lib/mock-data';
import { SiteSettingsProvider } from '@/contexts/site-settings-context';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ThemeProvider } from '@/contexts/theme-context';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.appName} - Effortless Group Expense Management`,
    description: `Simplify group expenses with ${settings.appName}. Track, split, and settle shared costs with ease.`,
    icons: {
      icon: settings.faviconUrl || '/favicon.svg',
      apple: '/icons/icon-192x192.png',
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: settings.appName,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <SiteSettingsProvider>
          <ThemeProvider>
            <AuthProvider>
              <FirebaseErrorListener />
              {children}
            </AuthProvider>
          </ThemeProvider>
          <Toaster />
        </SiteSettingsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
