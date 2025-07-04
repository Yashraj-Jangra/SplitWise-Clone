
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const settingsNavItems = [
  { title: 'General', href: '/admin/settings' },
  { title: 'Landing Page', href: '/admin/settings/landing' },
  { title: 'Auth Page', href: '/admin/settings/auth' },
  { title: 'Content Pages', href: '/admin/settings/pages' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Site Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your application-wide configurations and content.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {settingsNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 justify-start',
                  pathname === item.href
                    ? 'bg-primary/20 text-primary hover:bg-primary/20'
                    : 'hover:bg-transparent hover:underline text-muted-foreground'
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
