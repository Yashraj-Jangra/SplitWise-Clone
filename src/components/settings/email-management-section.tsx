"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useSiteSettings } from "@/contexts/site-settings-context";
import type { UserProfile } from "@/types";

interface EmailManagementSectionProps {
  userProfile: UserProfile;
}

const EMAIL_CHANNELS = [
  {
    key: "auth" as const,
    label: "Authentication",
    description: "Password resets, sign-in alerts & confirmations",
    icon: <Icons.ShieldCheck className="h-4 w-4 text-violet-400" />,
    iconBg: "bg-violet-500/10",
  },
  {
    key: "notifications" as const,
    label: "Notifications",
    description: "Expenses, settlements, invitations & reminders",
    icon: <Icons.Bell className="h-4 w-4 text-blue-400" />,
    iconBg: "bg-blue-500/10",
  },
  {
    key: "support" as const,
    label: "Support",
    description: "Replies to your support tickets",
    icon: <Icons.Help className="h-4 w-4 text-emerald-400" />,
    iconBg: "bg-emerald-500/10",
  },
];

export function EmailManagementSection({ userProfile }: EmailManagementSectionProps) {
  const { settings } = useSiteSettings();
  const fromAddresses = settings?.emailSettings?.fromAddresses;

  return (
    <div className="space-y-4">
      {/* Account email */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Account Email</p>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icons.Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{userProfile.email}</p>
            <p className="text-xs text-muted-foreground">Used to sign in to your account</p>
          </div>
        </div>
      </div>

      {/* Sending addresses */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Sending Addresses</p>
      <div className="space-y-2">
        {EMAIL_CHANNELS.map(({ key, label, description, icon, iconBg }) => {
          const address = fromAddresses?.[key] || fromAddresses?.default || "—";
          return (
            <div key={key} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/20">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{description}</p>
              </div>
              <p className="font-mono text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-xs">{address}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
