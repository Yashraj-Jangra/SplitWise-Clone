
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp = null as unknown as FirebaseApp;
let auth: Auth = null as unknown as Auth;
let db: Firestore = null as unknown as Firestore;
let storage: FirebaseStorage = null as unknown as FirebaseStorage;
let firebaseError: string | null = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase API Key is missing. Please add `NEXT_PUBLIC_FIREBASE_API_KEY` to your .env file.");
  }
  if (!firebaseConfig.projectId) {
     throw new Error("Firebase Project ID is missing. Please add `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to your .env file.");
  }
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Enable Firestore offline persistence so the app works with cached data
  // when the network is unavailable. Must be called before any Firestore operations.
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open — persistence can only be enabled in one tab at a time.
        console.warn('[Firestore] Offline persistence unavailable: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required.
        console.warn('[Firestore] Offline persistence not supported in this browser.');
      }
    });
  }
} catch (error: any) {
  firebaseError = error.message || "Failed to initialize Firebase. Check your .env configuration.";
  console.error("Firebase Initialization Error:", firebaseError);
}

export { app, auth, db, storage, firebaseError };
