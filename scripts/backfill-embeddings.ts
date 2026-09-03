import oracledb from 'oracledb';
import path from 'path';
import dotenv from 'dotenv';
import { embed } from '../src/lib/ai/embedder';
import { upsertVector } from '../src/lib/ai/vector-store';
import { buildExpenseChunk, buildSettlementChunk } from '../src/lib/ai/context-builder';
import { executeOracleQuery } from '../src/lib/nosql';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function backfill() {
  console.log('--- Starting SplitIt RAG Embeddings Backfill ---');

  // 1. Fetch all expenses from SplitItDB
  console.log('Fetching expenses from SplitItDB...');
  const expenseRows = await executeOracleQuery<{
    PK: string;
    SK: string;
    DATA: string | object;
  }>(`SELECT pk, sk, data FROM SplitItDB WHERE entityType = 'EXPENSE'`);

  console.log(`Found ${expenseRows.length} total expense documents in database.`);

  let indexedCount = 0;
  let skippedCount = 0;

  for (const row of expenseRows) {
    try {
      const data: any = typeof row.DATA === 'string' ? JSON.parse(row.DATA) : row.DATA;
      const expenseId = (row.SK || '').replace(/^EXPENSE#/, '');
      const groupId = (row.PK || '').replace(/^GROUP#/, '');

      if (!expenseId || !data.description || data.amount === undefined) {
        skippedCount++;
        continue;
      }

      const allUserIds = new Set<string>();
      if (data.expenseCreatorId) allUserIds.add(data.expenseCreatorId);
      (data.payers || []).forEach((p: any) => p.userId && allUserIds.add(p.userId));
      (data.participants || []).forEach((p: any) => p.userId && allUserIds.add(p.userId));

      if (allUserIds.size === 0) {
        skippedCount++;
        continue;
      }

      const textChunk = buildExpenseChunk({
        id: expenseId,
        description: data.description,
        amount: data.amount,
        date: data.date || new Date().toISOString(),
        category: data.category,
        notes: data.notes,
        payers: (data.payers || []).map((p: any) => ({ amount: p.amount })),
        participants: (data.participants || []).map((p: any) => ({ amountOwed: p.amountOwed })),
      });

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

      indexedCount++;
      if (indexedCount % 5 === 0) {
        console.log(`Progress: Indexed ${indexedCount} expenses (${allUserIds.size} vector partitions per item)...`);
      }

      // Small delay between calls to respect rate limit
      await new Promise((r) => setTimeout(r, 400));
    } catch (err: any) {
      console.warn(`Could not index expense ${row.SK}:`, err.message || err);
      skippedCount++;
    }
  }

  // 2. Fetch all settlements from SplitItDB
  console.log('Fetching settlements from SplitItDB...');
  const settlementRows = await executeOracleQuery<{
    PK: string;
    SK: string;
    DATA: string | object;
  }>(`SELECT pk, sk, data FROM SplitItDB WHERE entityType = 'SETTLEMENT'`);

  console.log(`Found ${settlementRows.length} total settlement documents in database.`);

  let indexedSettlements = 0;
  for (const row of settlementRows) {
    try {
      const data: any = typeof row.DATA === 'string' ? JSON.parse(row.DATA) : row.DATA;
      const settlementId = (row.SK || '').replace(/^SETTLEMENT#/, '');
      const groupId = (row.PK || '').replace(/^GROUP#/, '');

      if (!settlementId || data.amount === undefined || (!data.paidById && !data.paidToId)) {
        continue;
      }

      const textChunk = buildSettlementChunk({
        amount: data.amount,
        date: data.date || new Date().toISOString(),
        notes: data.notes,
      });

      const embedding = await embed(textChunk);

      const uids = [data.paidById, data.paidToId].filter(Boolean);
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
      await new Promise((r) => setTimeout(r, 400));
    } catch (err: any) {
      console.warn(`Could not index settlement ${row.SK}:`, err.message || err);
    }
  }

  console.log('--- Backfill Complete ---');
  console.log(`Successfully vectorized & indexed: ${indexedCount} expenses and ${indexedSettlements} settlements.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
