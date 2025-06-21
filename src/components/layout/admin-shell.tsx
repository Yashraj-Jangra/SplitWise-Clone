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
import { NavLinks } from "./nav-links";
import { UserNav } from "./user-nav";
import { DynamicYear } from "./dynamic-year";
import type { NavItem } from "@/types";

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
    title: "Manage Emails",
    href: "/admin/emails",
    icon: "Mail",
  },
];

const returnToAppNavItem: NavItem = {
    title: "Back to App",
    href: "/dashboard",
    icon: "Home",
};

function AdminHeader({ pageTitle }: { pageTitle?: string }) {
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
      {!isMobile && <div className="w-[52px]"></div>}
      
      {pageTitle && <h1 className="text-lg font-semibold md:text-xl font-headline">{pageTitle}</h1>}
       <div className="ml-auto flex items-center gap-2">
         <span className="text-xs font-semibold uppercase text-destructive tracking-wider">Admin Mode</span>
        <UserNav />
      </div>
    </header>
  );
}

function AdminSidebar() {
  const { open } = useSidebar(); 
  const isCollapsed = !open; 

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold" aria-label="SettleEase Admin Home">
          <Icons.AppLogo className="h-7 w-7 text-primary" />
          {!isCollapsed && <span className="text-xl font-headline text-foreground">SettleEase</span>}
        </Link>
        <SidebarTrigger className="ml-auto data-[state=open]:bg-sidebar-accent data-[state=closed]:bg-transparent"/>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <NavLinks items={adminNavItems} isCollapsed={isCollapsed} />
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <NavLinks items={[returnToAppNavItem]} isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}


interface AdminShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AdminShell({ children, pageTitle }: AdminShellProps) {
  const [effectiveSidebarDefaultOpen, setEffectiveSidebarDefaultOpen] = React.useState(true);

  React.useEffect(() => {
    let storedStateValue = true; 
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
      <AdminSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AdminHeader pageTitle={pageTitle} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
          <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t">
            SettleEase Admin &copy; <DynamicYear />
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
