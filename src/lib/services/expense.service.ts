import { getItem, putItem, queryByPk, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { Expense, ExpenseDocument, UserProfile, ExpensePayer, ExpenseParticipant } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifyExpenseAdded, notifyExpenseUpdated, notifyExpenseDeleted, notifyBudgetAlert } from '@/lib/notification-service';
import { getSiteSettings } from './settings.service';
import { getMasterCategory } from '../expense-categories';
import { getFullName } from '../utils';
import { format } from 'date-fns';
import { queueVectorEmbedding } from '@/lib/ai/queue-helper';

async function checkAndNotifyBudgetThreshold(
  groupId: string,
  groupDoc: any,
  actorId: string,
  expenseDate: Date,
  deltaAmount: number
) {
  try {
    const budget = groupDoc.budget;
    if (!budget || !budget.enabled || !budget.monthlyLimit || budget.monthlyLimit <= 0) {
      return;
    }

    const targetYear = expenseDate.getFullYear();
    const targetMonth = expenseDate.getMonth();

    const expenseDocs = await queryByPk<any>(`GROUP#${groupId}`);
    const monthExpenses = expenseDocs.filter((r: any) => {
      if (r.entityType !== 'EXPENSE' || !r.date) return false;
      const d = new Date(r.date);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });

    const currentTotal = monthExpenses.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
    const previousTotal = Math.max(0, currentTotal - deltaAmount);
    const limit = Number(budget.monthlyLimit);

    const prevPct = (previousTotal / limit) * 100;
    const newPct = (currentTotal / limit) * 100;

    const enabledThresholds: number[] = budget.alertThresholds || [75, 90, 100];

    const currentMembers: any[] = groupDoc.members || [];
    const memberIds = [...new Set(currentMembers.map((m: any) => (typeof m === 'string' ? m : m.userId)).filter(Boolean))];
    if (groupDoc.createdById && !memberIds.includes(groupDoc.createdById)) {
      memberIds.push(groupDoc.createdById);
    }

    if (enabledThresholds.includes(100) && prevPct < 100 && newPct >= 100) {
      await notifyBudgetAlert(
        memberIds,
        actorId,
        groupId,
        groupDoc.name,
        100,
        currentTotal,
        limit,
        true
      );
    } else if (enabledThresholds.includes(90) && prevPct < 90 && newPct >= 90) {
      await notifyBudgetAlert(
        memberIds,
        actorId,
        groupId,
        groupDoc.name,
        90,
        currentTotal,
        limit,
        false
      );
    } else if (enabledThresholds.includes(75) && prevPct < 75 && newPct >= 75) {
      await notifyBudgetAlert(
        memberIds,
        actorId,
        groupId,
        groupDoc.name,
        75,
        currentTotal,
        limit,
        false
      );
    }
  } catch (err) {
    console.error('Failed checking budget threshold:', err);
  }
}

function mapExpenseRow(row: any, payers: ExpensePayer[], participants: ExpenseParticipant[], creator: UserProfile): Expense {
  return {
    id: row.id,
    groupId: row.groupId,
    description: row.description,
    amount: row.amount,
    splitType: row.splitType as any,
    category: row.category || undefined,
    masterCategory: row.masterCategory || undefined,
    notes: row.notes || undefined,
    receiptImageUrl: row.receiptImageUrl || undefined,
    date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    payers,
    participants,
    expenseCreator: creator
  };
}

export async function addExpense(
  expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId' | 'masterCategory' | 'createdAt'> & { date: Date },
  actorId: string
): Promise<string> {
  const groupDoc = await getItem<any>(`GROUP#${expenseData.groupId}`, 'METADATA');
  if (!groupDoc) throw new Error("Group not found to add expense.");

  const settings = await getSiteSettings();
  const masterCategory = getMasterCategory(expenseData.category || 'Other', settings.expenseCategories);
  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newExpenseDoc = {
    id: expenseId,
    groupId: expenseData.groupId,
    description: expenseData.description,
    amount: expenseData.amount,
    splitType: expenseData.splitType,
    category: expenseData.category || null,
    masterCategory,
    notes: expenseData.notes || null,
    receiptImageUrl: expenseData.receiptImageUrl || null,
    expenseCreatorId: actorId,
    groupCreatorId: groupDoc.createdById,
    date: expenseData.date.toISOString(),
    createdAt: new Date().toISOString(),
    payers: expenseData.payers,
    participants: expenseData.participants,
  };

  await putItem(
    `GROUP#${expenseData.groupId}`,
    `EXPENSE#${expenseId}`,
    'EXPENSE',
    newExpenseDoc,
    `USER#${actorId}`,
    `EXPENSE#${expenseId}`
  );

  // Update group total
  groupDoc.totalExpenses = (groupDoc.totalExpenses || 0) + expenseData.amount;
  groupDoc.updatedAt = new Date().toISOString();
  await putItem(`GROUP#${expenseData.groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${expenseData.groupId}`);

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} added expense "${expenseData.description}" for ₹${expenseData.amount.toFixed(2)}.`;
  
  await logHistoryEvent(expenseData.groupId, 'expense_created', actorId, description, {
    expenseId,
    date: expenseData.date
  });

  // Notifications
  const recipientIds = expenseData.participants.map(p => p.userId).filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyExpenseAdded(recipientIds, actorId, expenseData.groupId, expenseId, expenseData.description, expenseData.amount);
  }

  // Budget threshold checks
  await checkAndNotifyBudgetThreshold(
    expenseData.groupId,
    groupDoc,
    actorId,
    expenseData.date,
    expenseData.amount
  );

  queueVectorEmbedding(expenseId, expenseData.groupId, 'expense', 'upsert');
  return expenseId;
}

export async function updateExpense(
  expenseId: string,
  oldAmount: number,
  expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'createdAt' | 'masterCategory'> & { date: Date; createdAt: string },
  actorId: string
): Promise<void> {
  const oldExpense = await getItem<any>(`GROUP#${expenseData.groupId}`, `EXPENSE#${expenseId}`);
  if (!oldExpense) throw new Error("Expense not found.");

  const settings = await getSiteSettings();
  const masterCategory = getMasterCategory(expenseData.category || 'Other', settings.expenseCategories);

  const updatedExpenseDoc = {
    ...oldExpense,
    description: expenseData.description,
    amount: expenseData.amount,
    splitType: expenseData.splitType,
    category: expenseData.category || null,
    masterCategory,
    notes: expenseData.notes || null,
    receiptImageUrl: expenseData.receiptImageUrl || null,
    date: expenseData.date.toISOString(),
    payers: expenseData.payers,
    participants: expenseData.participants,
    updatedAt: new Date().toISOString(),
  };

  await putItem(
    `GROUP#${expenseData.groupId}`,
    `EXPENSE#${expenseId}`,
    'EXPENSE',
    updatedExpenseDoc,
    `USER#${actorId}`,
    `EXPENSE#${expenseId}`
  );

  queueVectorEmbedding(expenseId, expenseData.groupId, 'expense', 'upsert');

  // Adjust group total & check budget
  const diff = expenseData.amount - oldAmount;
  const groupDoc = await getItem<any>(`GROUP#${expenseData.groupId}`, 'METADATA');
  if (groupDoc) {
    if (Math.abs(diff) > 0.001) {
      groupDoc.totalExpenses = (groupDoc.totalExpenses || 0) + diff;
      groupDoc.updatedAt = new Date().toISOString();
      await putItem(`GROUP#${expenseData.groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${expenseData.groupId}`);
    }

    if (diff > 0) {
      await checkAndNotifyBudgetThreshold(
        expenseData.groupId,
        groupDoc,
        actorId,
        expenseData.date,
        diff
      );
    }
  }

  // History & Notifications
  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);

  const changes: { field: string; from: any; to: any }[] = [];
  if (oldExpense.description !== expenseData.description) {
    changes.push({ field: 'Description', from: `"${oldExpense.description}"`, to: `"${expenseData.description}"` });
  }
  if (oldExpense.amount !== expenseData.amount) {
    changes.push({ field: 'Amount', from: `₹${oldExpense.amount.toFixed(2)}`, to: `₹${expenseData.amount.toFixed(2)}` });
  }

  if (changes.length > 0) {
    const description = `${actorName} updated expense details for "${oldExpense.description}".`;
    await logHistoryEvent(expenseData.groupId, 'expense_updated', actorId, description, {
      expenseId,
      changes,
      date: expenseData.date
    });

    const recipientIds = expenseData.participants.map(p => p.userId).filter(id => id !== actorId);
    if (recipientIds.length > 0) {
      await notifyExpenseUpdated(recipientIds, actorId, expenseData.groupId, expenseId, expenseData.description);
    }
  }
}

export async function deleteExpense(expenseId: string, groupId: string, amount: number, actorId: string): Promise<void> {
  const expense = await getItem<any>(`GROUP#${groupId}`, `EXPENSE#${expenseId}`);
  if (!expense) return;

  await deleteItem(`GROUP#${groupId}`, `EXPENSE#${expenseId}`);

  // Adjust group total
  const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
  if (groupDoc) {
    groupDoc.totalExpenses = Math.max(0, (groupDoc.totalExpenses || 0) - amount);
    groupDoc.updatedAt = new Date().toISOString();
    await putItem(`GROUP#${groupId}`, 'METADATA', 'GROUP', groupDoc, `USER#${groupDoc.createdById}`, `GROUP#${groupId}`);
  }

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} deleted expense "${expense.description}" (was ₹${amount.toFixed(2)}).`;

  await logHistoryEvent(groupId, 'expense_deleted', actorId, description, {
    ...expense,
    expenseId,
    date: expense.date
  });

  const participants: any[] = expense.participants || [];
  const recipientIds = participants.map(p => typeof p === 'string' ? p : p.userId).filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyExpenseDeleted(recipientIds, actorId, groupId, expense.description);
  }

  queueVectorEmbedding(expenseId, groupId, 'expense', 'delete');
}

export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  const items = await queryByPk<any>(`GROUP#${groupId}`);
  const expenseDocs = items.filter(i => i.id && i.description && i.amount !== undefined);

  const userIds = new Set<string>();
  expenseDocs.forEach(r => {
    userIds.add(r.expenseCreatorId);
    (r.payers || []).forEach((p: any) => userIds.add(typeof p === 'string' ? p : p.userId));
    (r.participants || []).forEach((p: any) => userIds.add(typeof p === 'string' ? p : p.userId));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return expenseDocs
    .map(r => {
      const creator = userMap.get(r.expenseCreatorId);
      if (!creator) return null;

      const payers = (r.payers || []).map((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        const u = userMap.get(uid);
        return u ? ({ amount: p.amount || 0, user: u } as ExpensePayer) : null;
      }).filter((p: any): p is ExpensePayer => p !== null);

      const participants = (r.participants || []).map((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        const u = userMap.get(uid);
        return u ? ({ amountOwed: p.amountOwed || 0, share: p.share || undefined, user: u } as ExpenseParticipant) : null;
      }).filter((p: any): p is ExpenseParticipant => p !== null);

      return mapExpenseRow(r, payers, participants, creator);
    })
    .filter((e: any): e is Expense => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpensesByUserId(userId: string): Promise<Expense[]> {
  const allExpenses = await getAllExpenses();
  return allExpenses.filter(e => {
    const isPayer = e.payers.some(p => p.user.uid === userId);
    const isParticipant = e.participants.some(p => p.user.uid === userId);
    return isPayer || isParticipant;
  });
}

export async function getAllExpenses(): Promise<Expense[]> {
  const allItems = await queryByEntityType<any>('EXPENSE');

  const userIds = new Set<string>();
  allItems.forEach(r => {
    userIds.add(r.expenseCreatorId);
    (r.payers || []).forEach((p: any) => userIds.add(typeof p === 'string' ? p : p.userId));
    (r.participants || []).forEach((p: any) => userIds.add(typeof p === 'string' ? p : p.userId));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return allItems
    .map(r => {
      const creator = userMap.get(r.expenseCreatorId);
      if (!creator) return null;

      const payers = (r.payers || []).map((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        const u = userMap.get(uid);
        return u ? ({ amount: p.amount || 0, user: u } as ExpensePayer) : null;
      }).filter((p: any): p is ExpensePayer => p !== null);

      const participants = (r.participants || []).map((p: any) => {
        const uid = typeof p === 'string' ? p : p.userId;
        const u = userMap.get(uid);
        return u ? ({ amountOwed: p.amountOwed || 0, share: p.share || undefined, user: u } as ExpenseParticipant) : null;
      }).filter((p: any): p is ExpenseParticipant => p !== null);

      return mapExpenseRow(r, payers, participants, creator);
    })
    .filter((e): e is Expense => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
