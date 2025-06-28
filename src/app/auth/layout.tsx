'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, loading } = useSiteSettings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center text-foreground hover:text-muted-foreground transition-colors">
          <Icons.AppLogo className="h-8 w-8 mr-2" />
           {loading ? (
             <Skeleton className="h-6 w-32" />
          ) : (
            <span className="text-xl font-semibold font-headline">{settings.appName}</span>
          )}
        </Link>
      </div>
      <div className="w-full max-w-md z-10">
        {children}
      </div>
      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        {loading ? <Skeleton className="h-4 w-48" /> : <p>&copy; {new Date().getFullYear()} {settings.appName}. All rights reserved.</p>}
      </footer>
    </div>
  );
}
