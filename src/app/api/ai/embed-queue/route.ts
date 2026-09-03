import { NextResponse } from 'next/server';
import { getItem } from '@/lib/nosql';
import { embed } from '@/lib/ai/embedder';
import { upsertVector, deleteVector } from '@/lib/ai/vector-store';
import { buildExpenseChunk, buildSettlementChunk } from '@/lib/ai/context-builder';
import { getUserProfile } from '@/lib/services/user.service';
import { getFullName } from '@/lib/utils';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';
const AI_EMBEDDING_QUEUE_ENABLED = process.env.AI_EMBEDDING_QUEUE_ENABLED !== 'false';

export async function POST(request: Request) {
  try {
    if (!AI_EMBEDDING_QUEUE_ENABLED) {
      return NextResponse.json({ skipped: true, reason: 'Embedding queue is disabled' });
    }

    // Security check
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-internal-secret');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (INTERNAL_API_SECRET && token !== INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized queue caller' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, groupId, entityType, action = 'upsert' } = body;

    if (!id || !entityType) {
      return NextResponse.json({ error: 'Missing id or entityType' }, { status: 400 });
    }

    if (action === 'delete') {
      await deleteVector(`EXPENSE#${id}`);
      await deleteVector(`SETTLEMENT#${id}`);
      return NextResponse.json({ success: true, action: 'deleted' });
    }

    if (entityType === 'expense' && groupId) {
      const expenseDoc = await getItem<any>(`GROUP#${groupId}`, `EXPENSE#${id}`);
      if (!expenseDoc) {
        return NextResponse.json({ error: 'Expense document not found' }, { status: 404 });
      }

      const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
      const groupName = groupDoc?.name || '';

      // Hydrate user names
      const allUserIds = new Set<string>();
      (expenseDoc.payers || []).forEach((p: any) => p.userId && allUserIds.add(p.userId));
      (expenseDoc.participants || []).forEach((p: any) => p.userId && allUserIds.add(p.userId));

      const nameMap = new Map<string, string>();
      for (const uid of allUserIds) {
        const profile = await getUserProfile(uid);
        nameMap.set(uid, getFullName(profile?.firstName, profile?.lastName) || 'Member');
      }

      const payersWithName = (expenseDoc.payers || []).map((p: any) => ({
        name: nameMap.get(p.userId) || 'Member',
        amount: p.amount,
      }));

      const participantsWithName = (expenseDoc.participants || []).map((p: any) => ({
        name: nameMap.get(p.userId) || 'Member',
        amountOwed: p.amountOwed,
      }));

      const textChunk = buildExpenseChunk({
        id,
        description: expenseDoc.description,
        amount: expenseDoc.amount,
        date: expenseDoc.date,
        category: expenseDoc.category,
        notes: expenseDoc.notes,
        payers: payersWithName,
        participants: participantsWithName,
        groupName,
      });

      const embedding = await embed(textChunk);

      // Upsert for every user involved so they can find it in their RAG query
      for (const uid of allUserIds) {
        await upsertVector({
          id: `EXPENSE#${id}#${uid}`,
          userId: uid,
          groupId,
          entityType: 'expense',
          textChunk,
          embedding,
        });
      }

      return NextResponse.json({ success: true, usersIndexed: allUserIds.size });
    }

    if (entityType === 'settlement' && groupId) {
      const settlementDoc = await getItem<any>(`GROUP#${groupId}`, `SETTLEMENT#${id}`);
      if (!settlementDoc) {
        return NextResponse.json({ error: 'Settlement document not found' }, { status: 404 });
      }

      const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
      const groupName = groupDoc?.name || '';

      const payer = await getUserProfile(settlementDoc.paidById);
      const payee = await getUserProfile(settlementDoc.paidToId);

      const textChunk = buildSettlementChunk({
        amount: settlementDoc.amount,
        date: settlementDoc.date,
        paidByName: getFullName(payer?.firstName, payer?.lastName) || 'Member',
        paidToName: getFullName(payee?.firstName, payee?.lastName) || 'Member',
        groupName,
        notes: settlementDoc.notes,
      });

      const embedding = await embed(textChunk);

      const uids = [settlementDoc.paidById, settlementDoc.paidToId].filter(Boolean);
      for (const uid of uids) {
        await upsertVector({
          id: `SETTLEMENT#${id}#${uid}`,
          userId: uid,
          groupId,
          entityType: 'settlement',
          textChunk,
          embedding,
        });
      }

      return NextResponse.json({ success: true, usersIndexed: uids.length });
    }

    return NextResponse.json({ skipped: true, reason: 'Unsupported entityType' });
  } catch (error: any) {
    console.error('Embed queue error:', error);
    return NextResponse.json({ error: error.message || 'Queue error' }, { status: 500 });
  }
}
