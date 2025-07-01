
import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '@/components/icons';
import { getSiteSettings } from '@/lib/mock-data';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <main className="w-full max-w-4xl mx-auto z-10">
        <div className="relative flex min-h-[600px] rounded-2xl shadow-2xl overflow-hidden bg-card/80 backdrop-blur-sm border border-border/50">
          {/* Left Panel: Image */}
          <div className="hidden md:block md:w-1/2 relative">
            <Image
              src={settings.authPage?.imageUrl || "https://placehold.co/800x1200.png"}
              alt="Authentication background"
              fill
              className="object-cover"
              data-ai-hint="mountain night"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* Right Panel: Form */}
          <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            {children}
          </div>
          
          {/* Decorative Wave */}
           <div className="absolute bottom-0 right-0 w-full h-48 text-primary overflow-hidden -z-10 pointer-events-none">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="absolute bottom-0 right-0 h-full w-full">
                    <path d="M-4.22,33.53 C151.32,234.23 241.29,-84.38 503.31,104.28 L500.00,150.00 L0.00,150.00 Z" style={{stroke: 'none', fill: 'hsl(var(--primary)/0.1)'}}></path>
                    <path d="M-4.22,63.53 C121.32,184.23 300.29,-4.38 503.31,74.28 L500.00,150.00 L0.00,150.00 Z" style={{stroke: 'none', fill: 'hsl(var(--primary)/0.2)'}}></path>
                </svg>
           </div>
        </div>
      </main>
    </div>
  );
}
