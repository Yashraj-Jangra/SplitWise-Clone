'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Icons } from '@/components/icons';
import { UserNav } from './user-nav';
import { DynamicYear } from './dynamic-year';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { NotificationBell } from './notification-bell';

const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: 'Dashboard',
  },
  {
    title: 'Manage Users',
    href: '/admin/users',
    icon: 'Users',
  },
  {
    title: 'Manage Groups',
    href: '/admin/groups',
    icon: 'Details',
  },
  {
    title: 'Support Tickets',
    href: '/admin/support',
    icon: 'Help',
  },
  {
    title: 'Broadcasts',
    href: '/admin/broadcasts',
    icon: 'Mail',
  },
  {
    title: 'Site Settings',
    href: '/admin/settings',
    icon: 'Settings',
    subItems: [
      { title: 'General', href: '/admin/settings' },
      { title: 'Theme', href: '/admin/settings/theme' },
      { title: 'Landing Page', href: '/admin/settings/landing' },
      { title: 'Auth Page', href: '/admin/settings/auth' },
      { title: 'Content Pages', href: '/admin/settings/pages' },
      { title: 'Categories', href: '/admin/settings/categories' },
      { title: 'Mail', href: '/admin/settings/mail' },
      { title: 'Notifications', href: '/admin/settings/notifications' },
      { title: 'Data Tools', href: '/admin/settings/data-tools' },
      { title: 'Misc', href: '/admin/settings/misc' },
    ],
  },
  {
    title: 'Back to App',
    href: '/dashboard',
    icon: 'Home',
  },
];

function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border/40 bg-background/70 px-4 md:px-6 backdrop-blur-md transition-all">
      <div className="flex-1 md:hidden">
        <MobileNav items={adminNavItems} />
      </div>
      <div className="flex flex-1 items-center justify-end space-x-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground rounded-md bg-muted/60 border border-border px-2 py-0.5">
          Admin Mode
        </span>

        <NotificationBell />
        <nav className="flex items-center space-x-2">
          <UserNav />
        </nav>
      </div>
    </header>
  );
}

function MainNav({ items, onLinkClick }: { items: NavItem[]; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const defaultAccordionValue = items.find((item) => item.subItems?.some((subItem) => pathname.startsWith(subItem.href)))?.href;

  return (
    <Accordion type="single" collapsible className="w-full space-y-0.5" defaultValue={defaultAccordionValue}>
      {items.map((item) => {
        if (!item.subItems) {
          const Icon = item.icon && Icons[item.icon];
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60',
                isActive && 'text-foreground bg-muted font-bold border-l-2 border-primary'
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.title}
            </Link>
          );
        }

        const isParentActive = item.subItems.some((sub) => pathname.startsWith(sub.href));
        const Icon = item.icon && Icons[item.icon];

        return (
          <AccordionItem value={item.href} key={item.href} className="border-b-0 my-0.5">
            <AccordionTrigger
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 hover:no-underline',
                isParentActive && 'text-foreground font-bold'
              )}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span>{item.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pb-1">
              <div className="flex flex-col space-y-0.5 border-l border-border ml-3 pl-3 pt-1">
                {item.subItems.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={onLinkClick}
                      className={cn(
                        'block rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50',
                        isSubActive && 'text-foreground font-bold bg-muted'
                      )}
                    >
                      {subItem.title}
                    </Link>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const { settings, loading } = useSiteSettings();

  const mainItems = items.filter((item) => item.href !== '/dashboard');
  const footerItem = items.find((item) => item.href === '/dashboard');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Icons.Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] flex flex-col p-0 border-r border-border bg-card">
        <SheetHeader className="p-3.5 border-b border-border">
          <SheetTitle>
            <Link href="/admin/dashboard" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
              <Icons.Logo className="h-6 w-6 text-primary" />
              {loading ? <Skeleton className="h-5 w-28" /> : <span className="font-extrabold text-base">{settings.appName}</span>}
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <MainNav items={mainItems} onLinkClick={() => setOpen(false)} />
        </div>
        {footerItem && (
          <div className="mt-auto p-3 border-t border-border">
            <MainNav items={[footerItem]} onLinkClick={() => setOpen(false)} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { settings, loading } = useSiteSettings();
  const mainItems = adminNavItems.filter((item) => item.href !== '/dashboard');
  const footerItem = adminNavItems.find((item) => item.href === '/dashboard');

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[260px_1fr] bg-background">
      <div className="hidden border-r border-border bg-card md:block">
        <div className="flex h-full max-h-screen flex-col sticky top-0">
          <div className="flex h-12 items-center border-b border-border px-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold">
              <Icons.Logo className="h-6 w-6 text-primary" />
              {loading ? <Skeleton className="h-5 w-28" /> : <span className="text-base font-extrabold text-foreground">{settings.appName} Admin</span>}
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <MainNav items={mainItems} />
          </div>
          <div className="mt-auto p-3 border-t border-border bg-card">
            {footerItem && (
              <div className="pb-1">
                <MainNav items={[footerItem]} />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border/50 font-mono">
              Admin &copy; <DynamicYear />
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 px-2.5 py-3 sm:p-4 lg:p-5 space-y-4">{children}</main>
      </div>
    </div>
  );
}
