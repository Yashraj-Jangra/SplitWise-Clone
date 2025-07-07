

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import type { NavItem } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


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
  isCollapsed: boolean; 
}

export function NavLinks({ items, isCollapsed }: NavLinksProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <TooltipProvider>
      <nav className="grid items-start gap-1">
        {items.map((item, index) => {
          const Icon = Icons[item.icon || "Dashboard"];
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          if (isCollapsed) {
            return (
              <Tooltip key={index} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.disabled ? "#" : item.href}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    aria-disabled={item.disabled}
                    tabIndex={item.disabled ? -1 : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{item.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-primary text-primary-foreground" : "text-foreground",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : undefined}
            >
              <Icon className={cn("h-5 w-5 mr-3")} />
              <span className="truncate group-hover:text-accent-foreground">
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
