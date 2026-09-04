'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Group } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { getGroupsByUserId } from '@/lib/mock-data';
import { BottomNavAddButton } from './bottom-nav-add-button';
import { useHaptics } from '@/hooks/use-haptics';

const navItems: { href: string; icon: IconName; label: string }[] = [
  { href: '/dashboard', icon: 'Home',     label: 'Home'     },
  { href: '/groups',    icon: 'Users',    label: 'Groups'   },
  { href: '/analysis',  icon: 'Analysis', label: 'Analysis' },
  { href: '/expenses',  icon: 'History',  label: 'Activity' },
];

function NavItem({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname();
  const haptic = useHaptics();
  const Icon = Icons[icon];
  const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');

  const handleTap = useCallback(() => {
    if (!isActive) haptic.light();
  }, [isActive, haptic]);

  return (
    <Link
      href={href}
      onClick={handleTap}
      className={cn(
        'inline-flex flex-col items-center justify-center gap-0.5 px-2 transition-all duration-150',
        'active:scale-90 active:opacity-70',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <div className={cn(
        'relative flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-200',
        isActive && 'bg-primary/15',
      )}>
        <Icon className={cn('w-5 h-5 transition-transform duration-150', isActive && 'scale-110')} />
        {/* Active indicator dot */}
        {isActive && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
      </div>
      <span className={cn(
        'text-[10px] font-medium transition-all duration-150',
        isActive ? 'text-primary' : 'text-muted-foreground',
      )}>
        {label}
      </span>
    </Link>
  );
}

export function BottomNavBar() {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    if (userProfile?.uid) {
      getGroupsByUserId(userProfile.uid).then(setGroups);
    }
  }, [userProfile]);

  // Hide bottom nav bar on full-page /assistant chat to dedicate full screen to conversation & input
  if (pathname === '/assistant') return null;

  const currentGroup = useMemo(() => {
    const match = pathname.match(/^\/groups\/([^/]+)/);
    if (match) {
      const groupId = match[1];
      return groups.find(g => g.id === groupId);
    }
    return undefined;
  }, [pathname, groups]);

  return (
    <footer
      className="md:hidden fixed bottom-0 left-0 z-50 w-full border-t bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {navItems.slice(0, 2).map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* FAB in the centre slot */}
        <div className="flex items-center justify-center">
          <div className="-mt-8">
            <BottomNavAddButton groups={groups} currentGroup={currentGroup} />
          </div>
        </div>

        {navItems.slice(2, 4).map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </footer>
  );
}
