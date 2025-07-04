

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
    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => {
                 const Icon = Icons[item.icon || "Dashboard"];
                 const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && item.href !== "/dashboard" && pathname.startsWith(item.href));
                 return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onLinkClick}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                            isActive && "text-primary bg-primary/20 font-semibold"
                        )}
                        >
                        <Icon className="h-5 w-5" />
                        {item.title}
                    </Link>
                 )
            })}
        </nav>
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
            <nav className="grid items-start px-4 text-sm font-medium">
              <MainNav items={adminNavItems} />
            </nav>
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
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
      </div>
    </div>
  );
}
