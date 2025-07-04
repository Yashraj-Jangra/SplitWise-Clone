
'use client';

import { Separator } from '@/components/ui/separator';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Site Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your application-wide configurations and content.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="w-full">{children}</div>
    </div>
  );
}
