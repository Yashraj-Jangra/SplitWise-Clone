
'use client';

import { useState, useEffect } from 'react';

/**
 * Detects when a new service worker is waiting to take control,
 * which means a new version of the app is available.
 *
 * Returns:
 *  - `updateAvailable`: boolean — true when a new SW is waiting
 *  - `applyUpdate`: function — calls `skipWaiting` on the new SW and reloads
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const userInitiatedUpdate = useState<{ current: boolean }>({ current: false })[0];

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const checkForWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      // If there is already a waiting worker at time of check
      checkForWaiting(registration);

      // Listen for new workers entering the "waiting" state
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    });

    // Only reload after new SW takes control IF the user explicitly initiated the update
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing && userInitiatedUpdate.current) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [userInitiatedUpdate]);

  const applyUpdate = () => {
    if (waitingWorker) {
      userInitiatedUpdate.current = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return { updateAvailable, applyUpdate, dismissUpdate };
}
