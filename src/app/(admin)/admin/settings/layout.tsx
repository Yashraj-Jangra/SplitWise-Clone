'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  FolderTree,
  Globe,
  Image as ImageIcon,
  Mail,
  Palette,
  Sliders,
  Wrench,
  Bell,
  Settings,
} from 'lucide-react';

const ADMIN_SETTINGS_NAV = [
  { label: 'General', href: '/admin/settings', icon: Settings },
  { label: 'Auth Wallpaper', href: '/admin/settings/auth', icon: ImageIcon },
  { label: 'Categories', href: '/admin/settings/categories', icon: FolderTree },
  { label: 'Mail / SMTP', href: '/admin/settings/mail', icon: Mail },
  { label: 'Misc & Branding', href: '/admin/settings/misc', icon: Sliders },
  { label: 'Theme Builder', href: '/admin/settings/theme', icon: Palette },
  { label: 'Data Tools', href: '/admin/settings/data-tools', icon: Wrench },
  { label: 'Notifications', href: '/admin/settings/notifications', icon: Bell },
  { label: 'Landing Page', href: '/admin/settings/landing', icon: Globe },
  { label: 'Policies & Terms', href: '/admin/settings/pages', icon: FileText },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Admin Site Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global application configuration, authentication wallpapers, email services, and theme customization.
          </p>
        </div>
      </div>

      {/* Horizontal Scrollable Nav Pill Bar */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x border-b border-border/30">
        {ADMIN_SETTINGS_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all snap-start border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground border-border/40"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="w-full">{children}</div>
    </div>
  );
}
