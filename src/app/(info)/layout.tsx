
'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { Button } from '@/components/ui/button';

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const { settings, loading } = useSiteSettings();

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/landing" className="flex items-center space-x-2">
                        <Icons.Logo className="h-8 w-8 text-primary" />
                        {loading ? <Skeleton className="h-6 w-32" /> : <span className="inline-block font-bold text-xl">{settings.appName}</span>}
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/auth/login">Log In</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/auth/signup">Sign Up</Link>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex flex-1 flex-col items-center">
                <div className="container w-full max-w-3xl py-8 md:py-12">{children}</div>
            </main>
            <footer className="border-t">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-8 px-4 md:h-24 md:flex-row">
                <p className="text-sm text-muted-foreground">
                    &copy; <DynamicYear /> {settings.appName}. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Link href="/about" className="hover:text-primary transition-colors">About</Link>
                    <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                    <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                </div>
                </div>
            </footer>
        </div>
    );
}
