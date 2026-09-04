
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';
import { getSiteSettings } from '@/lib/services/settings.service';
import { NotificationProvider } from '@/contexts/notification-context';
import { SiteSettingsProvider } from '@/contexts/site-settings-context';
import { ThemeProvider } from '@/contexts/theme-context';
import QueryProvider from '@/components/providers/QueryProvider';

// Self-hosted via Next.js — no external DNS round-trip, no render blocking
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

// force-dynamic is required because generateMetadata calls getSiteSettings dynamically
export const dynamic = 'force-dynamic';

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              var savedTheme = localStorage.getItem('user-theme-preference');
              if (savedTheme) {
                document.documentElement.className = document.documentElement.className + ' theme-' + savedTheme;
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            <SiteSettingsProvider>
              <ThemeProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </ThemeProvider>
            </SiteSettingsProvider>
          </AuthProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
