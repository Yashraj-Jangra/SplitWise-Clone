
'use client';

import { useServiceWorkerUpdate } from '@/hooks/use-service-worker-update';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Shows a dismissable top banner when a new version of the PWA is available.
 * Clicking "Update" triggers skipWaiting on the new service worker,
 * which causes the controllerchange event and a full page reload.
 */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      id="pwa-update-banner"
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5',
        'bg-primary text-primary-foreground text-sm',
        'animate-in slide-in-from-top-2 duration-300'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icons.AppLogo className="h-4 w-4 flex-shrink-0" />
        <p className="truncate">
          <span className="font-semibold">New version available</span>
          <span className="hidden sm:inline"> — Reload to get the latest features and fixes.</span>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          id="pwa-update-apply"
          size="sm"
          variant="secondary"
          className="h-7 text-xs px-3 font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={applyUpdate}
        >
          Update now
        </Button>
        <Button
          id="pwa-update-dismiss"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={dismissUpdate}
          aria-label="Dismiss update banner"
        >
          <Icons.Close className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
