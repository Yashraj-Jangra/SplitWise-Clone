
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import type { NavItem } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar"; 

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "Dashboard",
  },
  {
    title: "Groups",
    href: "/groups",
    icon: "Users",
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: "Expense",
  },
  {
    title: "Settlements",
    href: "/settlements",
    icon: "Settle",
  },
  {
    title: "Analysis",
    href: "/analysis",
    icon: "Analysis",
  }
];

export const settingsNavItem: NavItem = {
    title: "Settings",
    href: "/settings",
    icon: "Settings",
};

interface NavLinksProps {
  items: NavItem[];
  isCollapsed?: boolean; 
}

export function NavLinks({ items, isCollapsed }: NavLinksProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="grid items-start gap-1">
      {items.map((item, index) => {
        const Icon = Icons[item.icon || "Dashboard"];
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        const linkContent = (
          <>
            <Icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
            {!isCollapsed && (
              <span className="truncate group-hover:text-sidebar-accent-foreground">
                {item.title}
              </span>
            )}
          </>
        );

        const linkClasses = cn(
          "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground",
          isCollapsed ? "justify-center" : "",
          item.disabled && "cursor-not-allowed opacity-80"
        );

        if (isCollapsed) {
          return (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.disabled ? "#" : item.href}
                  className={linkClasses}
                  aria-disabled={item.disabled}
                  tabIndex={item.disabled ? -1 : undefined}
                >
                  {linkContent}
                  <span className="sr-only">{item.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4 bg-popover text-popover-foreground">
                {item.title}
                {item.label && (
                  <span className="ml-auto text-muted-foreground">
                    {item.label}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={index}
            href={item.disabled ? "#" : item.href}
            className={linkClasses}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : undefined}
          >
            {linkContent}
            {item.label && !isCollapsed && (
              <span className="ml-auto">{item.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
