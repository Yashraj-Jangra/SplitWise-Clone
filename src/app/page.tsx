
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { getSiteSettings } from '@/lib/mock-data';
import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/types';

export default function HomePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchSettingsAndSetImage() {
      const siteSettings = await getSiteSettings();
      setSettings(siteSettings);

      if (siteSettings.landingImages?.length > 0) {
        const randomImage = siteSettings.landingImages[Math.floor(Math.random() * siteSettings.landingImages.length)];
        setImageUrl(randomImage);
      } else {
        setImageUrl('https://placehold.co/1920x1080.png');
      }
    }
    fetchSettingsAndSetImage();
  }, []);

  if (!settings || !imageUrl) {
    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-black">
             <div className="text-center max-w-4xl mx-auto z-10">
                <div className="flex justify-center mb-8">
                  <Icons.AppLogo className="h-28 w-28 text-primary animate-spin" />
                </div>
                <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
                  Loading...
                </h1>
            </div>
        </main>
    )
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden">
      <Image
        src={imageUrl}
        alt="Office background"
        fill
        className="object-cover -z-10"
        quality={100}
        priority
        data-ai-hint="office workspace"
      />
      <div className="absolute inset-0 bg-black/60 -z-10" />

      <div className="text-center max-w-4xl mx-auto z-10">
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-12 duration-1000">
          <Icons.AppLogo className="h-28 w-28 text-primary animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200 drop-shadow-lg">
          {settings.appName}
        </h1>
        <p className="text-xl text-slate-200 mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400 drop-shadow-md">
          The quantum leap in managing shared expenses. Track, split, and settle your group costs with futuristic ease.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-in fade-in zoom-in-95 duration-500 delay-700">
          <Button asChild size="lg">
            <Link href="/auth/login">
              <Icons.Login className="mr-2" /> Enter the Grid
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
