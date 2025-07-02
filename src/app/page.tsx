

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { getSiteSettings } from '@/lib/mock-data';
import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

function LandingPageSkeleton() {
    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-black">
            <Skeleton className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 bg-black/60 -z-10" />

            <div className="text-center max-w-4xl mx-auto z-10">
                <div className="flex justify-center mb-8">
                    <Icons.AppLogo className="h-28 w-28 text-primary animate-pulse" />
                </div>
                <Skeleton className="h-16 w-3/4 mx-auto mb-6" />
                <Skeleton className="h-5 w-full mx-auto mb-10" />
                <Skeleton className="h-5 w-2/3 mx-auto mb-10" />
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                    <Skeleton className="h-12 w-48" />
                </div>
            </div>

            <footer className="absolute bottom-5 w-full px-6 text-center text-white/60 z-10">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-sm">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </footer>
        </main>
    );
}

export default function HomePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchSettingsAndSetImage() {
      try {
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);

        if (siteSettings.landingImages?.length > 0) {
          const randomImage = siteSettings.landingImages[Math.floor(Math.random() * siteSettings.landingImages.length)];
          setImageUrl(randomImage);
        } else {
          setImageUrl('https://placehold.co/1920x1080.png');
        }
      } catch (error) {
        console.error("Failed to load site settings:", error);
        setImageUrl('https://placehold.co/1920x1080.png');
      }
    }
    fetchSettingsAndSetImage();
  }, []);

  if (!settings || !imageUrl) {
    return <LandingPageSkeleton />;
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden">
      <Image
        src={imageUrl}
        alt="Background image"
        fill
        className="object-cover -z-10"
        quality={100}
        priority
        data-ai-hint="office workspace"
      />
      <div className="absolute inset-0 bg-black/60 -z-10" />

      <div className="text-center max-w-4xl mx-auto z-10">
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-12 duration-1000">
          <Icons.AppLogo className="h-28 w-28 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200 drop-shadow-lg">
          {settings.landingPage?.headline || settings.appName}
        </h1>
        <p className="text-xl text-slate-200 mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400 drop-shadow-md">
          {settings.landingPage?.subheadline || 'A default subheadline for your amazing application.'}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-in fade-in zoom-in-95 duration-500 delay-700">
          <Button asChild size="lg">
            <Link href="/auth/login">
              <Icons.Login className="mr-2" />
              {settings.landingPage?.ctaButtonText || 'Get Started'}
            </Link>
          </Button>
        </div>
      </div>

      <footer className="absolute bottom-5 w-full px-6 text-center text-white/60 z-10">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-sm">
           <p>&copy; <DynamicYear /> {settings.appName}.</p>
           <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
           <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
           <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}
