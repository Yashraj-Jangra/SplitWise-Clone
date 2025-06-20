import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center text-primary hover:text-primary/80 transition-colors">
          <Icons.AppLogo className="h-8 w-8 mr-2" />
          <span className="text-xl font-semibold font-headline">SettleEase</span>
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SettleEase. All rights reserved.</p>
      </footer>
    </div>
  );
}