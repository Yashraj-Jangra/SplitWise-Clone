const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Push] Browser does not support notifications or service workers.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied.');
      return false;
    }
    return await subscribeToPush(userId);
  } catch (error) {
    console.error('[Push] Error requesting permission:', error);
    return false;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.');
      return false;
    }

    const swReg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Obtain stable device ID from localStorage
    let deviceId = localStorage.getItem('push_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('push_device_id', deviceId);
    }

    const keys = subscription.toJSON().keys;
    if (!keys || !keys.p256dh || !keys.auth) {
      throw new Error('Failed to retrieve keys from push subscription.');
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceName: navigator.userAgent.substring(0, 150)
      })
    });

    if (!res.ok) {
      throw new Error('Failed to register subscription on backend.');
    }

    console.log('[Push] Subscribed to native Web Push successfully.');
    return true;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const deviceId = localStorage.getItem('push_device_id');
    if (deviceId) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      localStorage.removeItem('push_device_id');
    }

    const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
    }
    console.log('[Push] Unsubscribed successfully.');
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
  }
}

// Stubs for client shell compatibility (SSE handles foreground messages)
export async function listenForForegroundMessages(
  onNotification?: (title: string, body: string, data: Record<string, string>) => void
): Promise<() => void> {
  return () => {};
}
