import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function requestPushPermission(userId: string): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await subscribeToPush(userId);
    }
  } catch (error) {
    console.error('Error requesting push permission:', error);
  }
  return false;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return false;
    }

    if (!app) throw new Error("Firebase app not initialized");
    const messaging = getMessaging(app);

    // Send config to Service Worker for background message handling
    if ('serviceWorker' in navigator && app) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
            type: 'SET_FIREBASE_CONFIG',
            config: app.options
        });
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
        console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not defined. Push notifications will not work.');
        return false;
    }

    const currentToken = await getToken(messaging, { vapidKey });

    if (currentToken) {
      console.log('Got FCM token, saving to Firestore...');
      // Get a device ID (create a random one and store in localStorage if not exists)
      let deviceId = localStorage.getItem('push_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('push_device_id', deviceId);
      }

      // Save to Firestore: push_subscriptions/{userId}/devices/{deviceId}
      if (!db) throw new Error("Firestore not initialized");
      const tokenDocRef = doc(db, 'push_subscriptions', userId, 'devices', deviceId);
      await setDoc(tokenDocRef, {
        userId,
        fcmToken: currentToken,
        deviceName: navigator.userAgent.substring(0, 100), // Simple device info
        createdAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
      }, { merge: true });

      return true;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return false;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
    try {
        const messagingSupported = await isSupported();
        if (!messagingSupported) return;

        if (!app) return;
        const messaging = getMessaging(app);
        await deleteToken(messaging);

        const deviceId = localStorage.getItem('push_device_id');
        if (deviceId) {
             if (!db) return;
             const tokenDocRef = doc(db, 'push_subscriptions', userId, 'devices', deviceId);
             await deleteDoc(tokenDocRef);
        }
        
        console.log('Successfully unsubscribed from push notifications.');
    } catch (error) {
        console.error('Error unsubscribing from push:', error);
    }
}
