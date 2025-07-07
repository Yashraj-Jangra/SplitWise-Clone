

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { UserNav } from "./user-nav";
import type { NavItem } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeftClose, PanelRightOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";


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

function MainNav({ items, isCollapsed }: { items: NavItem[]; isCollapsed: boolean }) {
    const pathname = usePathname();
    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => {
                 const Icon = Icons[item.icon || "Dashboard"];
                 const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                 
                 if (isCollapsed) {
                     return (
                        <Tooltip key={item.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10",
                                        isActive && "bg-primary/20 text-primary"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="sr-only">{item.title}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="flex items-center gap-4">
                                {item.title}
                            </TooltipContent>
                        </Tooltip>
                     )
                 }

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

function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void; }) {
  const { userProfile } = useAuth();
  const { settings, loading } = useSiteSettings();

  return (
    <div className="hidden border-r bg-background md:block">
        <TooltipProvider>
            <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
            <div className={cn(
                "flex h-[60px] items-center border-b px-4",
                isCollapsed && "justify-center px-2"
              )}>
                {!isCollapsed && (
                  <Link href="/dashboard" className="flex items-center gap-2 font-semibold mr-auto" aria-label={settings.appName}>
                      <Icons.Logo className="h-8 w-8 text-primary" />
                      {loading ? <Skeleton className="h-6 w-32" /> : <span className="text-xl font-bold">{settings.appName}</span>}
                  </Link>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                    {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
            <div className="flex-1 overflow-y-auto py-2">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "px-2 justify-center" : "px-4")}>
                <MainNav items={mainNavItems} isCollapsed={isCollapsed} />
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "px-2" : "px-4")}>
                    {userProfile?.role === 'admin' && (
                        <MainNav items={[{ title: "Admin Panel", href: "/admin/dashboard", icon: "ShieldCheck" }]} isCollapsed={isCollapsed} />
                    )}
                    <MainNav items={[settingsNavItem]} isCollapsed={isCollapsed} />
                </nav>
            </div>
            </div>
        </TooltipProvider>
      </div>
  )
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
            <SheetContent side="left" className="w-[280px] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>
                        <Link href="/landing" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
                            <Icons.Logo className="h-8 w-8 text-primary" />
                            {loading ? <Skeleton className="h-6 w-32" /> : <span className="font-bold text-xl">{settings.appName}</span>}
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    <div className="my-4 pb-10 px-4">
                        <MainNav items={mainNavItems} isCollapsed={false} />
                    </div>
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
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(isMobile);
  
  React.useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  return (
    <div className={cn(
        "grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out",
        isCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
    )}>
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(prev => !prev)} />
       <div className="flex flex-col">
          <Header />
          <EmailVerificationBanner />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pt-0 animate-in fade-in-0 zoom-in-98 duration-300">
            {children}
          </main>
      </div>
    </div>
  );
}
