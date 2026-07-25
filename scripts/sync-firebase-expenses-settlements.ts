/**
 * Full sync: Firebase → Oracle
 * Syncs Groups (with members), Expenses, and Settlements
 * - Uses MERGE (upsert) so existing records are not lost/duplicated
 * - Members embedded in group data doc to match single-table schema
 * - Assigns groups to correct users via gsi1pk = USER#<createdById>
 */
import * as fs from 'fs';
import * as path from 'path';
import admin from 'firebase-admin';
import { putItem } from '../src/lib/nosql';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service-account.json not found in workspace root!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

function convertTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val._seconds === 'number') return new Date(val._seconds * 1000).toISOString();
  if (typeof val.seconds  === 'number') return new Date(val.seconds  * 1000).toISOString();
  return new Date().toISOString();
}

// ── Groups ────────────────────────────────────────────────────────────────────
async function syncGroups() {
  console.log('\n🔄 Fetching groups from Firebase Firestore...');
  const [groupsSnap, membersSnap] = await Promise.all([
    db.collection('groups').get(),
    db.collection('groupMembers').get(),
  ]);

  const groupDocs  = groupsSnap.docs;
  const memberDocs = membersSnap.docs;

  console.log(`Found ${groupDocs.length} groups and ${memberDocs.length} member records in Firebase.`);

  // Build memberId lookup: groupId → [userId, ...]
  const memberMap = new Map<string, { userId: string; joinedAt: string }[]>();
  for (const mDoc of memberDocs) {
    const m = mDoc.data();
    const groupId = m.groupId;
    if (!groupId) continue;
    if (!memberMap.has(groupId)) memberMap.set(groupId, []);
    memberMap.get(groupId)!.push({
      userId  : m.userId,
      joinedAt: convertTimestamp(m.joinedAt || m.createdAt),
    });
  }

  const BATCH_SIZE = 10;
  let syncedCount = 0;

  for (let i = 0; i < groupDocs.length; i += BATCH_SIZE) {
    const batch = groupDocs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (doc) => {
      const data      = doc.data();
      const id        = doc.id;
      const createdById = data.createdById || data.creatorId || data.ownerId || 'UNKNOWN';
      const members   = memberMap.get(id) || [];

      const groupDoc = {
        id,
        name           : data.name           || 'Untitled Group',
        description    : data.description    || null,
        coverImageUrl  : data.coverImageUrl  || null,
        currency       : data.currency       || null,
        totalExpenses  : Number(data.totalExpenses || 0),
        createdById,
        archivedAt     : data.archivedAt ? convertTimestamp(data.archivedAt) : null,
        createdAt      : convertTimestamp(data.createdAt),
        members,       // embedded array — same schema as import-oracle-nosql.ts
      };

      // pk=GROUP#<id>  sk=METADATA  gsi1pk=USER#<createdById>  gsi1sk=GROUP#<id>
      await putItem(
        `GROUP#${id}`,
        'METADATA',
        'GROUP',
        groupDoc,
        `USER#${createdById}`,
        `GROUP#${id}`,
      );
      syncedCount++;
    }));
    console.log(`  [Groups Progress] ${syncedCount} / ${groupDocs.length}`);
  }

  console.log(`✅ Synced ${syncedCount} groups to Oracle Autonomous DB.`);
  return syncedCount;
}

// ── Expenses ──────────────────────────────────────────────────────────────────
async function syncExpenses() {
  console.log('\n🔄 Fetching expenses from Firebase Firestore...');
  const snapshot = await db.collection('expenses').get();
  const docs = snapshot.docs;
  console.log(`Found ${docs.length} expenses in Firebase.`);

  const BATCH_SIZE = 10;
  let syncedCount = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batchDocs = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(batchDocs.map(async (doc) => {
      const data    = doc.data();
      const id      = doc.id;
      const groupId = data.groupId;
      if (!groupId) return;

      const expenseDoc = {
        id,
        groupId,
        description      : data.description        || 'Expense',
        amount           : Number(data.amount       || 0),
        splitType        : data.splitType           || 'equally',
        category         : data.category            || null,
        masterCategory   : data.masterCategory      || null,
        notes            : data.notes               || null,
        receiptImageUrl  : data.receiptImageUrl     || null,
        expenseCreatorId : data.expenseCreatorId    || (data.payers?.[0]?.userId) || null,
        groupCreatorId   : data.groupCreatorId      || null,
        date             : convertTimestamp(data.date),
        createdAt        : convertTimestamp(data.createdAt),
        payers           : data.payers              || [],
        participants     : data.participants         || [],
      };

      const creatorId = expenseDoc.expenseCreatorId || 'UNKNOWN';

      await putItem(
        `GROUP#${groupId}`,
        `EXPENSE#${id}`,
        'EXPENSE',
        expenseDoc,
        `USER#${creatorId}`,
        `EXPENSE#${id}`,
      );
      syncedCount++;
    }));
    console.log(`  [Expenses Progress] ${syncedCount} / ${docs.length}`);
  }

  console.log(`✅ Synced ${syncedCount} expenses to Oracle Autonomous DB.`);
  return syncedCount;
}

// ── Settlements ───────────────────────────────────────────────────────────────
async function syncSettlements() {
  console.log('\n🔄 Fetching settlements from Firebase Firestore...');
  const snapshot = await db.collection('settlements').get();
  const docs = snapshot.docs;
  console.log(`Found ${docs.length} settlements in Firebase.`);

  const BATCH_SIZE = 10;
  let syncedCount = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batchDocs = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(batchDocs.map(async (doc) => {
      const data    = doc.data();
      const id      = doc.id;
      const groupId = data.groupId;
      if (!groupId) return;

      const settlementDoc = {
        id,
        groupId,
        paidById  : data.paidById,
        paidToId  : data.paidToId,
        amount    : Number(data.amount || 0),
        date      : convertTimestamp(data.date),
        notes     : data.notes    || null,
        createdAt : convertTimestamp(data.createdAt),
      };

      await putItem(
        `GROUP#${groupId}`,
        `SETTLEMENT#${id}`,
        'SETTLEMENT',
        settlementDoc,
        `USER#${data.paidById}`,
        `SETTLEMENT#${id}`,
      );
      syncedCount++;
    }));
    console.log(`  [Settlements Progress] ${syncedCount} / ${docs.length}`);
  }

  console.log(`✅ Synced ${syncedCount} settlements to Oracle Autonomous DB.`);
  return syncedCount;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('🚀 Starting full Firebase → Oracle sync...');
    const groups      = await syncGroups();
    const expenses    = await syncExpenses();
    const settlements = await syncSettlements();

    console.log('\n══════════════════════════════════════════════');
    console.log('🎉 Firebase Sync Completed Successfully!');
    console.log(`  Groups synced      : ${groups}`);
    console.log(`  Expenses synced    : ${expenses}`);
    console.log(`  Settlements synced : ${settlements}`);
    console.log('══════════════════════════════════════════════');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
