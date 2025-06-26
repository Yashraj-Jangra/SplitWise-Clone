
"use client";

import * as React from "react";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { NavLinks, mainNavItems, settingsNavItem } from "./nav-links";
import { UserNav } from "./user-nav";
import { DynamicYear } from "./dynamic-year";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

function AppHeader({ pageTitle }: { pageTitle?: string }) {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {(isMobile) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
          aria-label="Toggle sidebar"
        >
          <Icons.Dashboard className="h-5 w-5" />
        </Button>
      )}
      {!isMobile && <div className="w-[52px]"> {/* Placeholder for trigger on desktop if trigger is inside sidebar */}</div>}
      
      {pageTitle && <h1 className="text-lg font-semibold md:text-xl font-headline">{pageTitle}</h1>}
      <div className="ml-auto flex items-center gap-4">
        <UserNav />
      </div>
    </header>
  );
}

function AppSidebar() {
  const { open } = useSidebar(); 
  const isCollapsed = !open; 

  return (
    <Sidebar collapsible="icon" variant="inset" side="left" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" aria-label="SettleEase Home">
          <Icons.AppLogo className="h-7 w-7 text-primary" />
          {!isCollapsed && <span className="text-xl font-headline text-foreground">SettleEase</span>}
        </Link>
        <SidebarTrigger className="ml-auto data-[state=open]:bg-sidebar-accent data-[state=closed]:bg-transparent"/>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <NavLinks items={mainNavItems} isCollapsed={isCollapsed} />
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <NavLinks items={[settingsNavItem]} isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
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
    <div className="bg-yellow-900/50 border border-yellow-400/50 text-yellow-200 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AppHeader pageTitle={pageTitle} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <EmailVerificationBanner />
            {children}
          </main>
          <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t">
            SettleEase &copy; <DynamicYear />
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
