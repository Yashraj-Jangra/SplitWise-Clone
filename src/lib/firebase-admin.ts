
import admin from 'firebase-admin';

// Check if the service account JSON is provided in the environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('Firebase service account credentials are not set in the environment variables. Please set FIREBASE_SERVICE_ACCOUNT.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This is the "singleton" pattern for Firebase Admin initialization.
 */
function initializeAdminApp() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

// Immediately initialize and export the admin instance.
// Other files will import this directly.
export const firebaseAdmin = initializeAdminApp();
