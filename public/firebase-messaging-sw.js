// Firebase Messaging Service Worker
// This file MUST live in /public so it's served from the root scope.
// It cannot import from src/ or use Next.js env vars directly.
// Instead, the NEXT_PUBLIC_ vars are injected at build time by next.config.ts
// via the swcMinify replacements, OR we inline them here manually.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// -------------------------------------------------------------------------
// IMPORTANT: These values are read from self.__FIREBASE_CONFIG which the
// client injects via postMessage on every page load, AND we also fall back
// to a hardcoded config so the SW works after a cold start / cache hit.
// -------------------------------------------------------------------------
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyA4ti6rybteSHsgN1rhpouTsL4DO4pYQvE",
  authDomain: "billsplitter-x6rnw.firebaseapp.com",
  projectId: "billsplitter-x6rnw",
  storageBucket: "billsplitter-x6rnw.firebasestorage.app",
  messagingSenderId: "437877855174",
  appId: "1:437877855174:web:ef46c307593da45866d8c7",
};

let messagingInitialized = false;

function initFirebase(config) {
  if (messagingInitialized) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);

      const title = payload.notification?.title || 'New Notification';
      const options = {
        body: payload.notification?.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: payload.data || {},
        tag: payload.data?.type || 'general', // Collapse duplicate notifications
        renotify: true,
        actions: [
          { action: 'open', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      self.registration.showNotification(title, options);
    });

    messagingInitialized = true;
    console.log('[SW] Firebase Messaging initialized successfully.');
  } catch (err) {
    console.error('[SW] Firebase init failed:', err);
  }
}

// Initialize immediately with fallback config so background messages work
// even without a postMessage from the client.
initFirebase(FALLBACK_CONFIG);

// Also allow the client to update the config (e.g. after dynamic config fetch)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') return;

  // Determine the URL to open
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab if one is already open
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: event.notification.data,
            });
            return;
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
