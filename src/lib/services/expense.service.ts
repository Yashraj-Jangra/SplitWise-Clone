import { prisma } from '@/lib/db';
import type { Expense, ExpenseDocument, UserProfile, ExpensePayer, ExpenseParticipant } from '@/types';
import { hydrateUsers, getUserProfile } from './user.service';
import { logHistoryEvent } from './history.service';
import { notifyExpenseAdded, notifyExpenseUpdated, notifyExpenseDeleted } from './notification.service';
import { getSiteSettings } from './settings.service';
import { getMasterCategory } from '../expense-categories';
import { getFullName } from '../utils';
import { format } from 'date-fns';

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
    date: row.date.toISOString(),
    createdAt: row.createdAt.toISOString(),
    payers,
    participants,
    expenseCreator: creator
  };
}

export async function addExpense(
  expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId' | 'masterCategory' | 'createdAt'> & { date: Date },
  actorId: string
): Promise<string> {
  const groupRow = await prisma.group.findUnique({ where: { id: expenseData.groupId } });
  if (!groupRow) throw new Error("Group not found to add expense.");

  const settings = await getSiteSettings();
  const masterCategory = getMasterCategory(expenseData.category || 'Other', settings.expenseCategories);

  const newExpense = await prisma.$transaction(async (tx) => {
    // 1. Create base expense
    const expense = await tx.expense.create({
      data: {
        groupId: expenseData.groupId,
        description: expenseData.description,
        amount: expenseData.amount,
        splitType: expenseData.splitType,
        category: expenseData.category,
        masterCategory,
        notes: expenseData.notes,
        receiptImageUrl: expenseData.receiptImageUrl,
        expenseCreatorId: actorId,
        groupCreatorId: groupRow.createdById,
        date: expenseData.date,
      }
    });

    // 2. Create payers
    await tx.expensePayer.createMany({
      data: expenseData.payers.map(p => ({
        expenseId: expense.id,
        userId: p.userId,
        amount: p.amount
      }))
    });

    // 3. Create participants
    await tx.expenseParticipant.createMany({
      data: expenseData.participants.map(p => ({
        expenseId: expense.id,
        userId: p.userId,
        amountOwed: p.amountOwed,
        share: p.share
      }))
    });

    // 4. Update group total
    await tx.group.update({
      where: { id: expenseData.groupId },
      data: { totalExpenses: { increment: expenseData.amount } }
    });

    return expense;
  });

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} added expense "${expenseData.description}" for $${expenseData.amount.toFixed(2)}.`;
  
  await logHistoryEvent(expenseData.groupId, 'expense_created', actorId, description, {
    expenseId: newExpense.id,
    date: expenseData.date
  });

  // Notifications
  const recipientIds = expenseData.participants.map(p => p.userId).filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyExpenseAdded(recipientIds, actorId, expenseData.groupId, newExpense.id, expenseData.description, expenseData.amount);
  }

  return newExpense.id;
}

export async function updateExpense(
  expenseId: string,
  oldAmount: number,
  expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'createdAt' | 'masterCategory'> & { date: Date; createdAt: string },
  actorId: string
): Promise<void> {
  const oldExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payers: true, participants: true }
  });
  if (!oldExpense) throw new Error("Expense not found.");

  const settings = await getSiteSettings();
  const masterCategory = getMasterCategory(expenseData.category || 'Other', settings.expenseCategories);

  await prisma.$transaction(async (tx) => {
    // 1. Delete old relations
    await tx.expensePayer.deleteMany({ where: { expenseId } });
    await tx.expenseParticipant.deleteMany({ where: { expenseId } });

    // 2. Recreate payers
    await tx.expensePayer.createMany({
      data: expenseData.payers.map(p => ({
        expenseId,
        userId: p.userId,
        amount: p.amount
      }))
    });

    // 3. Recreate participants
    await tx.expenseParticipant.createMany({
      data: expenseData.participants.map(p => ({
        expenseId,
        userId: p.userId,
        amountOwed: p.amountOwed,
        share: p.share
      }))
    });

    // 4. Update base expense
    await tx.expense.update({
      where: { id: expenseId },
      data: {
        description: expenseData.description,
        amount: expenseData.amount,
        splitType: expenseData.splitType,
        category: expenseData.category,
        masterCategory,
        notes: expenseData.notes,
        receiptImageUrl: expenseData.receiptImageUrl,
        date: expenseData.date,
      }
    });

    // 5. Adjust group total
    const diff = expenseData.amount - oldAmount;
    await tx.group.update({
      where: { id: expenseData.groupId },
      data: { totalExpenses: { increment: diff } }
    });
  });

  // History & Notifications
  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);

  const changes: { field: string; from: any; to: any }[] = [];
  if (oldExpense.description !== expenseData.description) {
    changes.push({ field: 'Description', from: `"${oldExpense.description}"`, to: `"${expenseData.description}"` });
  }
  if (oldExpense.amount !== expenseData.amount) {
    changes.push({ field: 'Amount', from: `$${oldExpense.amount.toFixed(2)}`, to: `$${expenseData.amount.toFixed(2)}` });
  }
  if (oldExpense.date.toISOString().split('T')[0] !== expenseData.date.toISOString().split('T')[0]) {
    changes.push({ field: 'Date', from: format(oldExpense.date, 'PPP'), to: format(expenseData.date, 'PPP') });
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
  const expense = await prisma.expense.findUnique({ where: { id: expenseId }, include: { participants: true } });
  if (!expense) return;

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: expenseId } });
    await tx.group.update({
      where: { id: groupId },
      data: { totalExpenses: { decrement: amount } }
    });
  });

  const actor = await getUserProfile(actorId);
  const actorName = getFullName(actor?.firstName, actor?.lastName);
  const description = `${actorName} deleted expense "${expense.description}" (was $${amount.toFixed(2)}).`;

  await logHistoryEvent(groupId, 'expense_deleted', actorId, description, {
    ...expense,
    expenseId,
    date: expense.date
  });

  // Notifications
  const recipientIds = expense.participants.map(p => p.userId).filter(id => id !== actorId);
  if (recipientIds.length > 0) {
    await notifyExpenseDeleted(recipientIds, actorId, groupId, expense.description);
  }
}

export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: { groupId },
    include: {
      payers: true,
      participants: true
    },
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.expenseCreatorId);
    r.payers.forEach(p => userIds.add(p.userId));
    r.participants.forEach(p => userIds.add(p.userId));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const creator = userMap.get(r.expenseCreatorId);
    if (!creator) return null;

    const payers = r.payers.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amount: p.amount, user: u } as ExpensePayer : null;
    }).filter((p): p is ExpensePayer => p !== null);

    const participants = r.participants.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amountOwed: p.amountOwed, share: p.share || undefined, user: u } as ExpenseParticipant : null;
    }).filter((p): p is ExpenseParticipant => p !== null);

    return mapExpenseRow(r, payers, participants, creator);
  }).filter((e): e is Expense => e !== null);
}

export async function getExpensesByUserId(userId: string): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: {
      OR: [
        { payers: { some: { userId } } },
        { participants: { some: { userId } } }
      ]
    },
    include: {
      payers: true,
      participants: true
    },
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.expenseCreatorId);
    r.payers.forEach(p => userIds.add(p.userId));
    r.participants.forEach(p => userIds.add(p.userId));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const creator = userMap.get(r.expenseCreatorId);
    if (!creator) return null;

    const payers = r.payers.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amount: p.amount, user: u } as ExpensePayer : null;
    }).filter((p): p is ExpensePayer => p !== null);

    const participants = r.participants.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amountOwed: p.amountOwed, share: p.share || undefined, user: u } as ExpenseParticipant : null;
    }).filter((p): p is ExpenseParticipant => p !== null);

    return mapExpenseRow(r, payers, participants, creator);
  }).filter((e): e is Expense => e !== null);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    include: {
      payers: true,
      participants: true
    },
    orderBy: { date: 'desc' }
  });

  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.expenseCreatorId);
    r.payers.forEach(p => userIds.add(p.userId));
    r.participants.forEach(p => userIds.add(p.userId));
  });

  const users = await hydrateUsers(Array.from(userIds));
  const userMap = new Map(users.map(u => [u.uid, u]));

  return rows.map(r => {
    const creator = userMap.get(r.expenseCreatorId);
    if (!creator) return null;

    const payers = r.payers.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amount: p.amount, user: u } as ExpensePayer : null;
    }).filter((p): p is ExpensePayer => p !== null);

    const participants = r.participants.map(p => {
      const u = userMap.get(p.userId);
      return u ? { amountOwed: p.amountOwed, share: p.share || undefined, user: u } as ExpenseParticipant : null;
    }).filter((p): p is ExpenseParticipant => p !== null);

    return mapExpenseRow(r, payers, participants, creator);
  }).filter((e): e is Expense => e !== null);
}
