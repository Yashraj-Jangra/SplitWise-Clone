

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn, getInitials, getFullName } from "@/lib/utils";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchDialog } from "./search-dialog";
import { NotificationBell } from "./notification-bell";
import { BottomNavBar } from "./bottom-nav-bar";
import { listenForForegroundMessages } from "@/lib/push-service";
import { UpdateBanner } from "@/components/shared/update-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAppVersionDisplay, BUILD_NUMBER } from "@/lib/version";


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

function MainNav({ items, isCollapsed, onLinkClick }: { items: NavItem[]; isCollapsed: boolean; onLinkClick?: () => void }) {
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
                                    onClick={onLinkClick}
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
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
                        onClick={onLinkClick}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
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

const AnimatedHamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="flex h-6 w-6 flex-col justify-center items-center gap-[5px] transition-all duration-300 ease-in-out">
    <div
      className={cn(
        "h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-in-out",
        open ? "rotate-45 translate-y-[7px]" : ""
      )}
    />
    <div
      className={cn(
        "h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-in-out",
        open ? "opacity-0" : "opacity-100"
      )}
    />
    <div
      className={cn(
        "h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-in-out",
        open ? "-rotate-45 -translate-y-[7px]" : ""
      )}
    />
  </div>
);


function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void; }) {
  const { userProfile, isAdmin } = useAuth();
  const { settings, loading } = useSiteSettings();

  return (
    <div className="hidden border-r bg-background md:block z-40">
        <TooltipProvider>
            <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
            <div className={cn(
                "flex h-[60px] items-center border-b transition-all duration-200",
                isCollapsed ? "justify-center px-2" : "justify-between px-4"
              )}>
                {isCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onToggle}
                        className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Expand sidebar"
                      >
                        {/* Brand Icon (Visible by default, fades out on hover) */}
                        <Icons.Logo className="h-7 w-7 text-primary transition-all duration-200 group-hover:opacity-0 group-hover:scale-75" />

                        {/* Expand Button (Hidden by default, reveals on hover) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-muted-foreground group-hover:text-foreground">
                          <Icons.PanelLeftOpen className="h-5 w-5" />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Expand sidebar</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold mr-auto group" aria-label={settings.appName}>
                      <Icons.Logo className="h-7 w-7 text-primary group-hover:scale-105 transition-transform duration-200" />
                      {loading ? <Skeleton className="h-6 w-32" /> : <span className="text-xl font-bold tracking-tight">{settings.appName}</span>}
                    </Link>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          onClick={onToggle}
                          aria-label="Collapse sidebar"
                        >
                          <Icons.PanelLeftClose className="h-4.5 w-4.5" />
                          <span className="sr-only">Collapse sidebar</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Collapse sidebar</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            <div className="flex-1 overflow-y-auto py-2">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "px-2 justify-center" : "px-4")}>
                <MainNav items={mainNavItems} isCollapsed={isCollapsed} />
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "px-2" : "px-4")}>
                    {isAdmin && (
                        <MainNav items={[{ title: "Admin Panel", href: "/admin/dashboard", icon: "ShieldCheck" }]} isCollapsed={isCollapsed} />
                    )}
                    <MainNav items={[settingsNavItem]} isCollapsed={isCollapsed} />
                </nav>
                {!isCollapsed && (
                  <div className="mt-3 pt-3 border-t border-border/40 text-[10px] font-mono text-muted-foreground/60 text-center">
                    {getAppVersionDisplay(true)}
                  </div>
                )}
            </div>
            </div>
        </TooltipProvider>
      </div>
  )
}

function Header() {
  const [open, setOpen] = React.useState(false);
  const { settings, loading } = useSiteSettings();
  const { userProfile, isAdmin, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/auth/login");
  };

  return (
      <header className="flex h-[60px] items-center gap-2.5 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-2.5 sm:px-4 lg:px-6 sticky top-0 z-30">
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 md:hidden hover:bg-transparent"
                >
                    <AnimatedHamburgerIcon open={open} />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[285px] sm:w-[320px] flex flex-col p-0 bg-background border-r border-border/40">
                <SheetHeader className="p-4 border-b border-border/40 flex-row items-center justify-between space-y-0">
                    <SheetTitle asChild>
                        <Link href="/dashboard" className="flex items-center space-x-2.5" onClick={() => setOpen(false)}>
                            <Icons.Logo className="h-7 w-7 text-primary" />
                            {loading ? <Skeleton className="h-6 w-28" /> : <span className="font-bold text-lg tracking-tight">{settings.appName}</span>}
                        </Link>
                    </SheetTitle>
                </SheetHeader>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    <MainNav items={mainNavItems} isCollapsed={false} onLinkClick={() => setOpen(false)} />
                    
                    <div className="pt-2 mt-2 border-t border-border/30 space-y-1">
                        {isAdmin && (
                            <Link
                                href="/admin/dashboard"
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
                                    pathname.startsWith("/admin") && "text-primary bg-primary/20 font-semibold"
                                )}
                            >
                                <Icons.ShieldCheck className="h-5 w-5 text-primary" />
                                <span>Admin Panel</span>
                            </Link>
                        )}
                        <Link
                            href="/support"
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
                                pathname.startsWith("/support") && "text-primary bg-primary/20 font-semibold"
                            )}
                        >
                            <Icons.Help className="h-5 w-5" />
                            <span>Help & Support</span>
                        </Link>
                        <Link
                            href="/settings"
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
                                pathname.startsWith("/settings") && "text-primary bg-primary/20 font-semibold"
                            )}
                        >
                            <Icons.Settings className="h-5 w-5" />
                            <span>Settings</span>
                        </Link>
                    </div>
                </div>

                {/* Bottom User Info & Version Footer */}
                <div className="mt-auto border-t border-border/40 bg-card/60 p-3 space-y-3">
                    {authLoading ? (
                        <div className="flex items-center gap-3 p-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ) : userProfile ? (
                        <div className="rounded-xl border border-border/40 bg-background/80 p-2.5 shadow-sm space-y-2.5">
                            <div className="flex items-center justify-between gap-2.5">
                                <Link
                                    href="/settings"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2.5 min-w-0 flex-1 group hover:opacity-85 transition-opacity"
                                >
                                    <Avatar className="h-9 w-9 border border-primary/30 shrink-0">
                                        <AvatarImage src={userProfile.avatarUrl} alt={getFullName(userProfile.firstName, userProfile.lastName)} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                            {getInitials(userProfile.firstName, userProfile.lastName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                                {getFullName(userProfile.firstName, userProfile.lastName)}
                                            </p>
                                            {isAdmin && (
                                                <span className="text-[9px] uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-1 py-0.2 rounded shrink-0">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                            {userProfile.email}
                                        </p>
                                    </div>
                                </Link>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleLogout}
                                    title="Log out"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-lg transition-colors"
                                >
                                    <Icons.Logout className="h-4 w-4" />
                                    <span className="sr-only">Log out</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-1">
                            <Button asChild size="sm" className="w-full">
                                <Link href="/auth/login" onClick={() => setOpen(false)}>Login</Link>
                            </Button>
                        </div>
                    )}

                    {/* Version & Build metadata */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/70 px-1">
                        <span>{getAppVersionDisplay(true)}</span>
                        <span>Build {BUILD_NUMBER}</span>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
        <div className="relative flex-1">
            <SearchDialog />
        </div>
        <NotificationBell />
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
    <div className="bg-yellow-900/50 border border-yellow-400/50 text-yellow-200 p-4 rounded-md flex flex-col sm:flex-row items-center justify-between gap-4 mx-2.5 my-4 sm:mx-4 lg:mx-6">
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
  const { toast } = useToast();
  const { userProfile } = useAuth();

  React.useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  // Listen for foreground FCM push messages and show them as toasts
  React.useEffect(() => {
    if (!userProfile) return;
    let unsubscribe: (() => void) | undefined;

    listenForForegroundMessages((title, body) => {
      toast({ title, description: body });
    }).then((fn) => {
      unsubscribe = fn;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, toast]);

  const handleToggle = () => setIsCollapsed(prev => !prev);

  return (
    <div className={cn(
        "grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out",
        isCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
    )}>
      <Sidebar isCollapsed={!!isCollapsed} onToggle={handleToggle} />
       <div className="flex flex-col">
          <UpdateBanner />
          <Header />
          <EmailVerificationBanner />
          <main className="flex flex-1 flex-col gap-3.5 sm:gap-4 lg:gap-6 px-2 py-3 sm:px-4 sm:py-4 lg:p-6 animate-in fade-in-0 duration-300 pb-24 md:pb-4 lg:pb-6">
            {children}
          </main>
          <BottomNavBar />
      </div>
    </div>
  );
}
