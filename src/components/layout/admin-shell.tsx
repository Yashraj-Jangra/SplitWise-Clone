

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useIsMobile } from "@/hooks/use-mobile";
import { Icons } from "@/components/icons";
import { UserNav } from "./user-nav";
import { DynamicYear } from "./dynamic-year";
import type { NavItem } from "@/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { Skeleton } from "../ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const adminNavItems: NavItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin/dashboard",
    icon: "Dashboard",
  },
  {
    title: "Manage Users",
    href: "/admin/users",
    icon: "Users",
  },
  {
    title: "Manage Groups",
    href: "/admin/groups",
    icon: "Details",
  },
  {
    title: "Site Settings",
    href: "/admin/settings",
    icon: "Settings",
    subItems: [
      { title: 'General', href: '/admin/settings' },
      { title: 'Landing Page', href: '/admin/settings/landing' },
      { title: 'Auth Page', href: '/admin/settings/auth' },
      { title: 'Content Pages', href: '/admin/settings/pages' },
    ]
  },
   {
    title: "Back to App",
    href: "/dashboard",
    icon: "Home",
  },
];


function AdminHeader() {
  const isMobile = useIsMobile();
  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b border-border/50 bg-background/50 px-4 md:px-8 backdrop-blur-sm">
      <div className="flex-1 md:hidden">
        <MobileNav items={adminNavItems} />
      </div>
      <div className="flex flex-1 items-center justify-end space-x-4">
        <span className="text-xs font-semibold uppercase text-destructive tracking-wider rounded-full bg-destructive/20 px-3 py-1">Admin Mode</span>
        <nav className="flex items-center space-x-2">
            <UserNav />
        </nav>
      </div>
    </header>
  );
}

function MainNav({ items, onLinkClick }: { items: NavItem[], onLinkClick?: () => void }) {
    const pathname = usePathname();
    const defaultAccordionValue = items.find(item => item.subItems?.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href)))?.href;

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue={defaultAccordionValue}>
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
                                "flex items-center gap-3 rounded-md px-3 py-2.5 my-1 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                                isActive && "text-primary bg-primary/20 font-semibold"
                            )}
                        >
                            {Icon && <Icon className="h-5 w-5" />}
                            {item.title}
                        </Link>
                    );
                }

                const isParentActive = item.subItems.some(sub => pathname.startsWith(sub.href));
                const Icon = item.icon && Icons[item.icon];

                return (
                    <AccordionItem value={item.href} key={item.href} className="border-b-0 my-1">
                        <AccordionTrigger
                            className={cn(
                                "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 hover:no-underline",
                                isParentActive && "text-primary bg-primary/20 font-semibold"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {Icon && <Icon className="h-5 w-5" />}
                                <span>{item.title}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 pb-1">
                           <div className="flex flex-col space-y-1 border-l-2 border-border ml-5 pl-4 pt-1">
                                {item.subItems.map((subItem) => {
                                    const isSubActive = pathname === subItem.href;
                                    return (
                                        <Link
                                            key={subItem.href}
                                            href={subItem.href}
                                            onClick={onLinkClick}
                                            className={cn(
                                                "block rounded-md px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                                                isSubActive && "text-primary bg-primary/20 font-semibold"
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

function MobileNav({ items }: {items: NavItem[]}) {
    const [open, setOpen] = React.useState(false);
    const { settings, loading } = useSiteSettings();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                >
                    <Icons.Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] flex flex-col p-0">
                 <SheetHeader className="p-4 border-b">
                    <SheetTitle>
                        <Link href="/admin/dashboard" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
                            <Icons.Logo className="h-8 w-8 text-primary" />
                            {loading ? <Skeleton className="h-6 w-32" /> : <span className="font-bold text-xl">{settings.appName}</span>}
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <div className="my-4 pb-10 px-4">
                      <MainNav items={items} onLinkClick={() => setOpen(false)} />
                  </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { settings, loading } = useSiteSettings();
  
  return (
     <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
      <div className="hidden border-r border-border/50 bg-background/50 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
          <div className="flex h-[60px] items-center border-b border-border/50 px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
              <Icons.Logo className="h-8 w-8 text-primary" />
              {loading ? <Skeleton className="h-6 w-32" /> : <span className="text-xl font-bold">{settings.appName}</span>}
            </Link>
          </div>
          <div className="flex-1">
            <div className="grid items-start px-4 text-sm font-medium">
              <MainNav items={adminNavItems} />
            </div>
          </div>
           <div className="mt-auto p-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                 Admin Panel &copy; <DynamicYear/>
              </p>
           </div>
        </div>
      </div>
       <div className="flex flex-col">
          <AdminHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 animate-in fade-in-0 zoom-in-98 duration-300">
            {children}
          </main>
      </div>
    </div>
  );
}
