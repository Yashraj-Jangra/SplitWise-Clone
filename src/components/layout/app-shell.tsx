
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { UserNav } from "./user-nav";
import type { NavItem } from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { Skeleton } from "../ui/skeleton";

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "Dashboard" },
  { title: "Groups", href: "/groups", icon: "Users" },
  { title: "Expenses", href: "/expenses", icon: "Expense" },
  { title: "Settlements", href: "/settlements", icon: "Settle" },
  { title: "Analysis", href: "/analysis", icon: "Analysis" },
];

const settingsNavItem: NavItem = {
    title: "Settings",
    href: "/settings",
    icon: "Settings",
};

function Sidebar() {
  const { userProfile } = useAuth();
  const { settings, loading } = useSiteSettings();

  return (
    <div className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Icons.Logo className="h-8 w-8 text-primary" />
              {loading ? <Skeleton className="h-6 w-32" /> : <span className="text-xl font-bold">{settings.appName}</span>}
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-4 text-sm font-medium">
              <MainNav items={mainNavItems} />
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
             <nav className="grid items-start px-2 text-sm font-medium">
                {userProfile?.role === 'admin' && (
                  <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 mb-2">
                    <Icons.ShieldCheck className="h-5 w-5" />
                    Admin Panel
                  </Link>
                )}
                <MainNav items={[settingsNavItem]} />
             </nav>
          </div>
        </div>
      </div>
  )
}

function MainNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => {
                 const Icon = Icons[item.icon || "Dashboard"];
                 const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                 return (
                    <Link
                        key={item.href}
                        href={item.href}
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

function Header() {
  const [open, setOpen] = React.useState(false);
  const { settings, loading } = useSiteSettings();

  return (
      <header className="flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6 sticky top-0 z-30">
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 md:hidden"
                >
                    <Icons.Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0 w-[280px]">
                <Link href="/" className="mr-6 flex items-center space-x-2 px-4" onClick={() => setOpen(false)}>
                    <Icons.Logo className="h-8 w-8 text-primary" />
                    {loading ? <Skeleton className="h-6 w-32" /> : <span className="font-bold text-xl">{settings.appName}</span>}
                </Link>
                <div className="my-4 h-[calc(100vh-8rem)] pb-10 overflow-y-auto pl-4">
                    <MainNav items={mainNavItems} />
                </div>
            </SheetContent>
        </Sheet>
        <div className="relative flex-1">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="w-full md:w-1/2 lg:w-1/3 pl-9 bg-muted/50 focus:bg-card" />
        </div>
        <UserNav />
      </header>
  )
}

function EmailVerificationBanner() {
  const { firebaseUser, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);

  if (!firebaseUser || firebaseUser.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setIsSending(true);
    try {
      await resendVerificationEmail();
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder) for the verification link.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-yellow-900/50 border border-yellow-400/50 text-yellow-200 p-4 rounded-md flex flex-col sm:flex-row items-center justify-between gap-4 mx-4 my-6 lg:mx-6">
      <div className="flex items-start sm:items-center gap-3">
        <Icons.Mail className="h-6 w-6 flex-shrink-0 mt-1 sm:mt-0" />
        <div>
          <p className="font-bold">Please verify your email address.</p>
          <p className="text-sm text-yellow-300">A verification link was sent to {firebaseUser.email}.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleResend} disabled={isSending} className="bg-yellow-300/10 text-yellow-200 border-yellow-300/50 hover:bg-yellow-300/20 w-full sm:w-auto flex-shrink-0">
        {isSending ? "Sending..." : "Resend Email"}
      </Button>
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
      <Sidebar />
       <div className="flex flex-col">
          <Header />
          <EmailVerificationBanner />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pt-0">
            {children}
          </main>
      </div>
    </div>
  );
}
