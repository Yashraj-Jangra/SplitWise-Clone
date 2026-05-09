"use client";

import { Badge } from "@/components/ui/badge";
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
    label: "Authentication Emails",
    description: "Password resets, registration confirmations, and login alerts.",
    icon: <Icons.ShieldCheck className="h-4 w-4" />,
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  {
    key: "notifications" as const,
    label: "Notification Emails",
    description: "Expense alerts, settlements, member invitations, and balance reminders.",
    icon: <Icons.Bell className="h-4 w-4" />,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    key: "support" as const,
    label: "Support Emails",
    description: "Replies to your support tickets from the team.",
    icon: <Icons.Help className="h-4 w-4" />,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
];

export function EmailManagementSection({ userProfile }: EmailManagementSectionProps) {
  const { settings } = useSiteSettings();
  const fromAddresses = settings?.emailSettings?.fromAddresses;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icons.Mail className="h-4 w-4 text-primary" />
          </div>
          Email Management
        </CardTitle>
        <CardDescription>
          Your account email and how the app sends you notifications.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Account email row */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Account Email</p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Icons.Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{userProfile.email}</p>
              <p className="text-xs text-muted-foreground">Used to sign in to your account</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">Primary</Badge>
          </div>
        </div>

        {/* Divider with label */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Emails sent to you from</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* From-address rows */}
        <div className="space-y-3">
          {EMAIL_CHANNELS.map(({ key, label, description, icon, badgeColor }) => {
            const address = fromAddresses?.[key] || fromAddresses?.default || "—";
            return (
              <div key={key} className="flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}>
                      Admin configured
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  <p className="mt-1.5 font-mono text-xs font-medium text-foreground/80 truncate">{address}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          Sending addresses are configured by your administrator. You can manage which notifications you receive in the <span className="font-medium">Notifications</span> section below.
        </p>
      </CardContent>
    </Card>
  );
}
