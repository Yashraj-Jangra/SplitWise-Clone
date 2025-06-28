import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { Card } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/mock-data';

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 animated-gradient-bg overflow-hidden">
      <div className="text-center max-w-4xl mx-auto z-10">
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-12 duration-1000">
          <Icons.AppLogo className="h-28 w-28 text-primary animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-foreground mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200">
          {settings.appName}
        </h1>
        <p className="text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400">
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

      <footer className="absolute bottom-5 text-center text-muted-foreground/50 z-10">
        <p>&copy; <DynamicYear /> {settings.appName}. The Future of Shared Expenses.</p>
      </footer>
    </main>
  );
}
