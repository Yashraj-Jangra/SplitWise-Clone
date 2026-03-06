'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useMemo } from 'react';
import type { Group } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { getGroupsByUserId } from '@/lib/mock-data';
import { BottomNavAddButton } from './bottom-nav-add-button';

const navItems: { href: string; icon: IconName; label: string }[] = [
  { href: '/dashboard', icon: 'Home', label: 'Home' },
  { href: '/groups', icon: 'Users', label: 'Groups' },
  { href: '/analysis', icon: 'Analysis', label: 'Analysis' },
  { href: '/expenses', icon: 'History', label: 'Activity' },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (userProfile?.uid) {
      getGroupsByUserId(userProfile.uid).then(setGroups);
    }
  }, [userProfile]);

  const currentGroup = useMemo(() => {
    const match = pathname.match(/^\/groups\/([^/]+)/);
    if (match) {
      const groupId = match[1];
      return groups.find(g => g.id === groupId);
    }
    return undefined;
  }, [pathname, groups]);

  return (
    <footer className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 border-t bg-background/95 backdrop-blur-sm">
        <div className="grid h-full grid-cols-5">
            {navItems.slice(0, 2).map((item) => {
                const Icon = Icons[item.icon];
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
                return (
                    <Link key={item.href} href={item.href} className={cn("inline-flex flex-col items-center justify-center font-medium px-2 hover:bg-muted/50", isActive ? "text-primary" : "text-muted-foreground")}>
                        <Icon className="w-6 h-6 mb-1"/>
                        <span className="text-xs">{item.label}</span>
                    </Link>
                )
            })}
            
            <div className="flex items-center justify-center">
                <div className="-mt-8">
                    <BottomNavAddButton groups={groups} currentGroup={currentGroup} />
                </div>
            </div>

            {navItems.slice(2, 4).map((item) => {
                const Icon = Icons[item.icon];
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
                return (
                    <Link key={item.href} href={item.href} className={cn("inline-flex flex-col items-center justify-center font-medium px-2 hover:bg-muted/50", isActive ? "text-primary" : "text-muted-foreground")}>
                        <Icon className="w-6 h-6 mb-1"/>
                        <span className="text-xs">{item.label}</span>
                    </Link>
                )
            })}
        </div>
    </footer>
  );
}
