
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';
import { getSiteSettings } from '@/lib/mock-data';
import { SiteSettingsProvider } from '@/contexts/site-settings-context';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ThemeProvider } from '@/contexts/theme-context';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
      </body>
    </html>
  );
}
