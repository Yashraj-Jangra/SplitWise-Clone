import oracledb from 'oracledb';
import path from 'path';
import dotenv from 'dotenv';
import { embed } from '../src/lib/ai/embedder';
import { upsertVector } from '../src/lib/ai/vector-store';
import { buildExpenseChunk, buildSettlementChunk } from '../src/lib/ai/context-builder';
import { executeOracleQuery, getItem } from '../src/lib/nosql';
import { getUserProfile } from '../src/lib/services/user.service';
import { getFullName } from '../src/lib/utils';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const isDryRun = process.argv.includes('--dry-run');
const groupArgIdx = process.argv.indexOf('--group');
const targetGroup = groupArgIdx !== -1 ? process.argv[groupArgIdx + 1] : undefined;
const concurrencyIdx = process.argv.indexOf('--concurrency');
const concurrency = concurrencyIdx !== -1 ? Math.max(1, parseInt(process.argv[concurrencyIdx + 1], 10) || 2) : 2;
const limitIdx = process.argv.indexOf('--limit');
const limitCount = limitIdx !== -1 ? Math.max(1, parseInt(process.argv[limitIdx + 1], 10) || 100) : undefined;

// In-memory caches to minimize DB queries
const userCache = new Map<string, string>();
const groupCache = new Map<string, string>();

async function getCachedUserName(uid: string): Promise<string> {
  if (!uid) return 'Member';
  if (userCache.has(uid)) return userCache.get(uid)!;
  try {
    const profile = await getUserProfile(uid);
    const name = getFullName(profile?.firstName, profile?.lastName) || profile?.username || 'Member';
    userCache.set(uid, name);
    return name;
  } catch {
    return 'Member';
  }
}

async function getCachedGroupName(groupId: string): Promise<string> {
  if (!groupId) return '';
  if (groupCache.has(groupId)) return groupCache.get(groupId)!;
  try {
    const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
    const name = groupDoc?.name || '';
    groupCache.set(groupId, name);
    return name;
  } catch {
    return '';
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let index = 0;
  const running: Promise<void>[] = [];

  for (const item of items) {
    const currentIndex = index++;
    const p = worker(item, currentIndex).then(() => {
      running.splice(running.indexOf(p), 1);
    });
    running.push(p);

    if (running.length >= limit) {
      await Promise.race(running);
    }
  }

  await Promise.all(running);
}

async function backfill() {
  console.log('=== SplitIt RAG Embeddings Backfill ===');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no embeddings generated)' : '⚡ LIVE BACKFILL'}`);
  if (targetGroup) console.log(`Filter: Scoped to group "${targetGroup}"`);
  console.log(`Concurrency: ${concurrency}`);

  // 1. Fetch all expenses
  console.log('\n[1/2] Querying expenses from SplitItDB...');
  let expenseQuery = `SELECT pk, sk, data FROM SplitItDB WHERE entityType = 'EXPENSE'`;
  const queryParams: Record<string, any> = {};

  if (targetGroup) {
    expenseQuery += ` AND pk = :pk`;
    queryParams.pk = `GROUP#${targetGroup}`;
  }

  const expenseRows = await executeOracleQuery<{
    PK: string;
    SK: string;
    DATA: string | object;
  }>(expenseQuery, queryParams);

  const itemsToProcess = limitCount ? expenseRows.slice(0, limitCount) : expenseRows;
  console.log(`Found ${expenseRows.length} expense records${limitCount ? ` (processing top ${itemsToProcess.length})` : ''}.`);

  let indexedExpenses = 0;
  let skippedExpenses = 0;

  await runWithConcurrency(itemsToProcess, concurrency, async (row, idx) => {
    try {
      const data: any = typeof row.DATA === 'string' ? JSON.parse(row.DATA) : row.DATA;
      const expenseId = (row.SK || '').replace(/^EXPENSE#/, '');
      const groupId = (row.PK || '').replace(/^GROUP#/, '');

      if (!expenseId || !data.description || data.amount === undefined) {
        skippedExpenses++;
        return;
      }

      const allUserIds = new Set<string>();
      if (data.expenseCreatorId) allUserIds.add(data.expenseCreatorId);
      (data.payers || []).forEach((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        if (uid) allUserIds.add(uid);
      });
      (data.participants || []).forEach((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        if (uid) allUserIds.add(uid);
      });

      if (allUserIds.size === 0) {
        skippedExpenses++;
        return;
      }

      const groupName = await getCachedGroupName(groupId);

      // Hydrate user names
      const payersWithName = await Promise.all(
        (data.payers || []).map(async (p: any) => ({
          name: await getCachedUserName(typeof p === 'string' ? p : p.userId),
          amount: typeof p === 'object' ? p.amount : undefined,
        }))
      );

      const participantsWithName = await Promise.all(
        (data.participants || []).map(async (p: any) => ({
          name: await getCachedUserName(typeof p === 'string' ? p : p.userId),
          amountOwed: typeof p === 'object' ? p.amountOwed : undefined,
        }))
      );

      const textChunk = buildExpenseChunk({
        id: expenseId,
        description: data.description,
        amount: Number(data.amount) || 0,
        date: data.date || new Date().toISOString(),
        category: data.category,
        notes: data.notes,
        payers: payersWithName,
        participants: participantsWithName,
        groupName,
      });

      if (isDryRun) {
        console.log(`[${idx + 1}/${expenseRows.length}] [DRY RUN] EXPENSE#${expenseId}: "${data.description}" (₹${data.amount}) → ${allUserIds.size} partitions`);
        indexedExpenses++;
        return;
      }

      const embedding = await embed(textChunk);

      for (const uid of allUserIds) {
        await upsertVector({
          id: `EXPENSE#${expenseId}#${uid}`,
          userId: uid,
          groupId,
          entityType: 'expense',
          textChunk,
          embedding,
        });
      }

      indexedExpenses++;
      if (indexedExpenses % 5 === 0 || indexedExpenses === expenseRows.length) {
        console.log(`[${idx + 1}/${expenseRows.length}] ✓ Embedded EXPENSE#${expenseId} ("${data.description}", ₹${data.amount}) for ${allUserIds.size} users`);
      }

      // Small throttling delay to protect rate limits
      await new Promise((r) => setTimeout(r, 250));
    } catch (err: any) {
      console.warn(`⚠️ Error processing expense ${row.SK}:`, err.message || err);
      skippedExpenses++;
    }
  });

  // 2. Fetch all settlements
  console.log('\n[2/2] Querying settlements from SplitItDB...');
  let settlementQuery = `SELECT pk, sk, data FROM SplitItDB WHERE entityType = 'SETTLEMENT'`;
  if (targetGroup) {
    settlementQuery += ` AND pk = :pk`;
  }

  const settlementRows = await executeOracleQuery<{
    PK: string;
    SK: string;
    DATA: string | object;
  }>(settlementQuery, queryParams);

  const settlementsToProcess = limitCount ? settlementRows.slice(0, limitCount) : settlementRows;
  console.log(`Found ${settlementRows.length} settlement records${limitCount ? ` (processing top ${settlementsToProcess.length})` : ''}.`);

  let indexedSettlements = 0;
  let skippedSettlements = 0;

  await runWithConcurrency(settlementsToProcess, concurrency, async (row, idx) => {
    try {
      const data: any = typeof row.DATA === 'string' ? JSON.parse(row.DATA) : row.DATA;
      const settlementId = (row.SK || '').replace(/^SETTLEMENT#/, '');
      const groupId = (row.PK || '').replace(/^GROUP#/, '');

      if (!settlementId || data.amount === undefined || (!data.paidById && !data.paidToId)) {
        skippedSettlements++;
        return;
      }

      const groupName = await getCachedGroupName(groupId);
      const paidByName = await getCachedUserName(data.paidById);
      const paidToName = await getCachedUserName(data.paidToId);

      const textChunk = buildSettlementChunk({
        amount: Number(data.amount) || 0,
        date: data.date || new Date().toISOString(),
        paidByName,
        paidToName,
        groupName,
        notes: data.notes,
      });

      const uids = [data.paidById, data.paidToId].filter(Boolean);

      if (isDryRun) {
        console.log(`[${idx + 1}/${settlementRows.length}] [DRY RUN] SETTLEMENT#${settlementId}: ${paidByName} paid ${paidToName} ₹${data.amount} → ${uids.length} partitions`);
        indexedSettlements++;
        return;
      }

      const embedding = await embed(textChunk);

      for (const uid of uids) {
        await upsertVector({
          id: `SETTLEMENT#${settlementId}#${uid}`,
          userId: uid,
          groupId,
          entityType: 'settlement',
          textChunk,
          embedding,
        });
      }

      indexedSettlements++;
      if (indexedSettlements % 5 === 0 || indexedSettlements === settlementRows.length) {
        console.log(`[${idx + 1}/${settlementRows.length}] ✓ Embedded SETTLEMENT#${settlementId} (₹${data.amount}) for ${uids.length} users`);
      }

      await new Promise((r) => setTimeout(r, 250));
    } catch (err: any) {
      console.warn(`⚠️ Error processing settlement ${row.SK}:`, err.message || err);
      skippedSettlements++;
    }
  });

  console.log('\n=== Backfill Summary ===');
  console.log(`Expenses: ${indexedExpenses} indexed, ${skippedExpenses} skipped`);
  console.log(`Settlements: ${indexedSettlements} indexed, ${skippedSettlements} skipped`);
  console.log(`Mode was: ${isDryRun ? 'DRY RUN (no DB vector rows modified)' : 'LIVE'}`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});

