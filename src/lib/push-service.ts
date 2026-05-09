import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Registers the service worker and requests notification permission.
 * Returns true if an FCM token was successfully obtained and stored.
 */
export async function requestPushPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) {
    console.warn('[Push] This browser does not support notifications.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied.');
      return false;
    }
    return await subscribeToPush(userId);
  } catch (error) {
    console.error('[Push] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Obtains an FCM token and stores it in Firestore.
 * Must be called after permission is granted.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.warn('[Push] Firebase Messaging is not supported in this browser.');
      return false;
    }

    if (!VAPID_KEY) {
      console.error('[Push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.');
      return false;
    }

    if (!app) throw new Error('Firebase app not initialized');

    // Ensure the service worker is registered at the correct scope
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      // Register the SW explicitly so Firebase uses the right one
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      // Wait for the SW to be active before proceeding
      await navigator.serviceWorker.ready;

      // Forward our Firebase config so the SW can handle background messages
      // even if it was already cached without config
      const activeWorker = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (activeWorker && app.options) {
        activeWorker.postMessage({
          type: 'SET_FIREBASE_CONFIG',
          config: app.options,
        });
      }
    }

    const messaging = getMessaging(app);

    // Get FCM token, optionally binding to our explicit SW registration
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!currentToken) {
      console.warn('[Push] No FCM token available. Check VAPID key and SW registration.');
      return false;
    }

    console.log('[Push] Got FCM token, saving to Firestore...');

    // Stable device ID persisted in localStorage
    let deviceId = localStorage.getItem('push_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('push_device_id', deviceId);
    }

    if (!db) throw new Error('Firestore not initialized');
    const tokenDocRef = doc(db, 'push_subscriptions', userId, 'devices', deviceId);
    await setDoc(
      tokenDocRef,
      {
        userId,
        fcmToken: currentToken,
        deviceName: navigator.userAgent.substring(0, 150),
        createdAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
      },
      { merge: true }
    );

    console.log('[Push] FCM token saved successfully.');
    return true;
  } catch (error) {
    console.error('[Push] Error subscribing to push notifications:', error);
    return false;
  }
}

/**
 * Deletes the FCM token and removes the device from Firestore.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported) return;
    if (!app) return;

    const messaging = getMessaging(app);
    await deleteToken(messaging);

    const deviceId = localStorage.getItem('push_device_id');
    if (deviceId && db) {
      const tokenDocRef = doc(db, 'push_subscriptions', userId, 'devices', deviceId);
      await deleteDoc(tokenDocRef);
      localStorage.removeItem('push_device_id');
    }

    console.log('[Push] Successfully unsubscribed from push notifications.');
  } catch (error) {
    console.error('[Push] Error unsubscribing from push notifications:', error);
  }
}

/**
 * Listens for foreground FCM messages and shows a browser notification.
 * Call this once after the user has granted permission (e.g. in a layout component).
 * Returns an unsubscribe function.
 */
export async function listenForForegroundMessages(
  onNotification?: (title: string, body: string, data: Record<string, string>) => void
): Promise<() => void> {
  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported || !app) return () => {};

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[Push] Foreground message received:', payload);
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      const data = (payload.data as Record<string, string>) || {};

      // Trigger a custom handler (e.g. to show an in-app toast)
      if (onNotification) {
        onNotification(title, body, data);
      }

      // Also show a browser notification if the tab is hidden
      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
        });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Push] Error setting up foreground message listener:', error);
    return () => {};
  }
}
