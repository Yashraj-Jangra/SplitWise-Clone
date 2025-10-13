
import admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

export function initializeAdminApp() {
  if (!serviceAccount) {
    throw new Error('Firebase service account credentials are not set in the environment variables. Please set FIREBASE_SERVICE_ACCOUNT.');
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}
