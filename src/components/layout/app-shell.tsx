
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { DynamicYear } from "./dynamic-year";

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
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" aria-label="SettleEase Home">
          <Icons.AppLogo className="h-7 w-7 text-primary" />
          {!isCollapsed && <span className="text-xl font-headline text-foreground">SettleEase</span>}
        </Link>
        {!isCollapsed && <SidebarTrigger className="ml-auto data-[state=open]:bg-sidebar-accent data-[state=closed]:bg-transparent"/>}
      </SidebarHeader>
      <SidebarContent className="p-2">
        <ScrollArea className="h-full">
          <NavLinks items={mainNavItems} isCollapsed={isCollapsed} />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <NavLinks items={[settingsNavItem]} isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}


interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  // This state will be `true` for SSR and the first client render pass.
  // It will be updated by the useEffect hook on the client.
  const [effectiveSidebarDefaultOpen, setEffectiveSidebarDefaultOpen] = React.useState(true);

  React.useEffect(() => {
    // This effect runs only on the client, after the initial render and hydration.
    let storedStateValue = true; // Default if cookie is not found
    if (typeof window !== "undefined") {
      const storedCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('sidebar_state='))
        ?.split('=')[1];
      if (storedCookie) {
        storedStateValue = storedCookie === 'true';
      }
    }
    setEffectiveSidebarDefaultOpen(storedStateValue);
  }, []);


  return (
    <SidebarProvider defaultOpen={effectiveSidebarDefaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AppHeader pageTitle={pageTitle} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
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
