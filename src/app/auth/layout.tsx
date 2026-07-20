import { getSiteSettings } from '@/lib/mock-data';
import Image from 'next/image';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const bgImage = settings.authPage?.imageUrl || "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80";

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden select-none">
      
      {/* ── Full-Page Background Image (Configurable via Admin Panel) ─────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Authentication background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark overlay without backdrop blur */}
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* Top spacer */}
      <div className="w-full max-w-[420px] h-4 relative z-10" />

      {/* ── Center Glassmorphic Form Hub ── */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto my-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-[420px] mx-auto text-center py-4 text-xs text-white/70">
        <p>&copy; {new Date().getFullYear()} {settings.appName}. All rights reserved.</p>
      </footer>

    </div>
  );
}
