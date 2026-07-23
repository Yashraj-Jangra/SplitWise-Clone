import * as fs from 'fs';
import * as path from 'path';
import admin from 'firebase-admin';
import { putItem } from '../src/lib/nosql';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: service-account.json not found in workspace root!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function convertTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val._seconds === 'number') return new Date(val._seconds * 1000).toISOString();
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return new Date().toISOString();
}

async function syncExpenses() {
  console.log('🔄 Fetching expenses from Firebase Firestore...');
  const snapshot = await db.collection('expenses').get();
  const docs = snapshot.docs;
  console.log(`Found ${docs.length} expenses in Firebase.`);

  const BATCH_SIZE = 10;
  let syncedCount = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batchDocs = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batchDocs.map(async (doc) => {
        const data = doc.data();
        const id = doc.id;
        const groupId = data.groupId;
        if (!groupId) return;

        const expenseDoc = {
          id,
          groupId,
          description: data.description || 'Expense',
          amount: Number(data.amount || 0),
          splitType: data.splitType || 'equally',
          category: data.category || null,
          masterCategory: data.masterCategory || null,
          notes: data.notes || null,
          receiptImageUrl: data.receiptImageUrl || null,
          expenseCreatorId: data.expenseCreatorId || (data.payers?.[0]?.userId) || null,
          groupCreatorId: data.groupCreatorId || null,
          date: convertTimestamp(data.date),
          createdAt: convertTimestamp(data.createdAt),
          payers: data.payers || [],
          participants: data.participants || [],
        };

        const creatorId = expenseDoc.expenseCreatorId || 'UNKNOWN';

        await putItem(
          `GROUP#${groupId}`,
          `EXPENSE#${id}`,
          'EXPENSE',
          expenseDoc,
          `USER#${creatorId}`,
          `EXPENSE#${id}`
        );
        syncedCount++;
      })
    );
    console.log(`  [Expenses Progress] ${syncedCount} / ${docs.length}`);
  }
  console.log(`✅ Synced ${syncedCount} expenses to Oracle Autonomous DB.`);
}

async function syncSettlements() {
  console.log('🔄 Fetching settlements from Firebase Firestore...');
  const snapshot = await db.collection('settlements').get();
  const docs = snapshot.docs;
  console.log(`Found ${docs.length} settlements in Firebase.`);

  const BATCH_SIZE = 10;
  let syncedCount = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batchDocs = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batchDocs.map(async (doc) => {
        const data = doc.data();
        const id = doc.id;
        const groupId = data.groupId;
        if (!groupId) return;

        const settlementDoc = {
          id,
          groupId,
          paidById: data.paidById,
          paidToId: data.paidToId,
          amount: Number(data.amount || 0),
          date: convertTimestamp(data.date),
          notes: data.notes || null,
          createdAt: convertTimestamp(data.createdAt),
        };

        await putItem(
          `GROUP#${groupId}`,
          `SETTLEMENT#${id}`,
          'SETTLEMENT',
          settlementDoc,
          `USER#${data.paidById}`,
          `SETTLEMENT#${id}`
        );
        syncedCount++;
      })
    );
    console.log(`  [Settlements Progress] ${syncedCount} / ${docs.length}`);
  }
  console.log(`✅ Synced ${syncedCount} settlements to Oracle Autonomous DB.`);
}

async function main() {
  try {
    await syncExpenses();
    await syncSettlements();
    console.log('🎉 Firebase Sync Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
