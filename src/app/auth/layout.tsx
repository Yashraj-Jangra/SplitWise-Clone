import { getSiteSettings } from '@/lib/api.client';
import Image from 'next/image';
import { Icons } from '@/components/icons';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const bgImage = settings.authPage?.imageUrl || "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80";

  return (
    <div className="min-h-screen md:h-screen w-full flex flex-col md:flex-row bg-background select-none overflow-x-hidden md:overflow-hidden">
      
      {/* ── Left Visual Pane (Desktop/Tablet) ────────────────────────────── */}
      <div className="relative hidden md:flex w-1/2 h-full flex-col justify-between p-10 lg:p-14 text-white overflow-hidden flex-shrink-0">
        {/* Background Image with Zoom and Smooth Loading */}
        <div className="absolute inset-0 z-0">
          <Image
            src={bgImage}
            alt="Authentication background"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center transition-all duration-75 scale-105"
          />
          {/* Moody Overlay for Typography Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
        </div>

        {/* Top Header: Logo + App Name */}
        <div className="relative z-10 flex items-center gap-3">
          <Icons.Logo className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold tracking-wider text-white">
            {settings.appName}
          </span>
        </div>

        {/* Bottom Context: Title & Subtitle */}
        <div className="relative z-10 mt-auto max-w-md space-y-3">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            {settings.authPage?.loginTitle || "Welcome Back"}
          </h2>
          <p className="text-sm lg:text-base text-neutral-300 font-normal leading-relaxed">
            {settings.authPage?.loginSubtitle || "Keep track of your shared bills, balances, and settle up with friends easily."}
          </p>
        </div>
      </div>

      {/* ── Right Content Pane (All Viewports) ───────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:p-10 bg-background min-h-screen md:min-h-0 md:h-full overflow-y-auto">
        
        {/* Top Spacer or Small Desktop Logo */}
        <div className="w-full flex justify-end md:justify-start items-center">
          <div className="h-6" />
        </div>

        {/* Center Form Hub */}
        <main className="relative w-full max-w-[420px] mx-auto my-auto flex flex-col justify-center py-4">
          {/* Mobile-Only Interactive Banner */}
          <div 
            className="block md:hidden mb-6 relative w-full h-36 overflow-hidden border border-border/50 shadow-md"
            style={{ borderRadius: 'var(--radius-card)' }}
          >
            <Image
              src={bgImage}
              alt="Mobile cover banner"
              fill
              sizes="90vw"
              className="object-cover object-center"
            />
            {/* Dark gradient for text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 flex flex-col justify-end p-4" />
            
            {/* Branding on banner */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Icons.Logo className="h-7 w-7 text-primary" />
              <span className="text-sm font-black tracking-widest text-white uppercase">
                {settings.appName}
              </span>
            </div>
          </div>

          {children}
        </main>

        {/* Footer */}
        <footer className="w-full text-center py-3 text-[11px] text-muted-foreground mt-4 border-t border-border/10">
          <p>&copy; {new Date().getFullYear()} {settings.appName}. All rights reserved.</p>
        </footer>

      </div>

    </div>
  );
}

