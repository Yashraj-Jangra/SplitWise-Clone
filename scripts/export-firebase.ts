import * as fs from 'fs';
import * as path from 'path';
import admin from 'firebase-admin';

// Load service account from environment or JSON file
const serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
let serviceAccount: any;

if (serviceAccountKeyB64) {
  serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8'));
} else {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  } else {
    console.error("Error: firebase service-account.json not found in root, and FIREBASE_SERVICE_ACCOUNT_B64 env is not set.");
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const exportDir = path.join(process.cwd(), 'scripts', 'exports');

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

const collections = [
  'users',
  'groups',
  'expenses',
  'settlements',
  'history',
  'tickets',
  'notifications_v2',
  'user_notification_prefs',
];

async function exportCollection(colName: string) {
  console.log(`Exporting collection: ${colName}...`);
  const snapshot = await db.collection(colName).get();
  const data: any[] = [];
  snapshot.forEach(doc => {
    data.push({ id: doc.id, ...doc.data() });
  });
  const filePath = path.join(exportDir, `${colName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved ${data.length} documents from ${colName} to ${filePath}`);
}

async function exportSettings() {
  console.log("Exporting settings...");
  const settingsCol = db.collection('settings');
  const snapshot = await settingsCol.get();
  const data: Record<string, any> = {};
  snapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });
  const filePath = path.join(exportDir, `settings.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved site settings documents to ${filePath}`);
}

async function main() {
  try {
    for (const col of collections) {
      await exportCollection(col);
    }
    await exportSettings();
    console.log("Firestore export complete!");
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}

main();
