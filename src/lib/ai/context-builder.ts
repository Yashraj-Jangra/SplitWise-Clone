import type { RetrievedChunk } from '@/types/ai';

export function buildExpenseChunk(expense: {
  id?: string;
  description: string;
  amount: number;
  date: string | Date;
  category?: string;
  notes?: string;
  payers?: Array<{ name?: string; amount?: number }>;
  participants?: Array<{ name?: string; amountOwed?: number }>;
  groupName?: string;
}): string {
  const dateStr = typeof expense.date === 'string' 
    ? expense.date.slice(0, 10) 
    : expense.date?.toISOString ? expense.date.toISOString().slice(0, 10) : '';

  const payerInfo = expense.payers && expense.payers.length > 0
    ? expense.payers.map((p) => `${p.name || 'User'} paid ₹${p.amount || 0}`).join(', ')
    : 'Unknown payer';

  const participantInfo = expense.participants && expense.participants.length > 0
    ? expense.participants.map((p) => `${p.name || 'User'} owes ₹${p.amountOwed || 0}`).join(', ')
    : 'Split between members';

  let chunk = `Expense: ₹${expense.amount} for "${expense.description}" on ${dateStr}. Category: ${expense.category || 'Miscellaneous'}. ${payerInfo}. ${participantInfo}.`;
  if (expense.groupName) {
    chunk += ` Group: ${expense.groupName}.`;
  }
  if (expense.notes) {
    chunk += ` Notes: ${expense.notes}.`;
  }
  return chunk;
}

export function buildSettlementChunk(settlement: {
  amount: number;
  date: string | Date;
  paidByName?: string;
  paidToName?: string;
  groupName?: string;
  notes?: string;
}): string {
  const dateStr = typeof settlement.date === 'string'
    ? settlement.date.slice(0, 10)
    : settlement.date?.toISOString ? settlement.date.toISOString().slice(0, 10) : '';

  let chunk = `Settlement payment: ${settlement.paidByName || 'User'} paid ₹${settlement.amount} to ${settlement.paidToName || 'User'} on ${dateStr}.`;
  if (settlement.groupName) {
    chunk += ` Group: ${settlement.groupName}.`;
  }
  if (settlement.notes) {
    chunk += ` Notes: ${settlement.notes}.`;
  }
  return chunk;
}

export function buildGroupMetaChunk(group: {
  id?: string;
  name: string;
  description?: string;
  memberNames?: string[];
  totalExpenses?: number;
  budgetLimit?: number;
}): string {
  let chunk = `Group: "${group.name}".`;
  if (group.description) {
    chunk += ` Description: ${group.description}.`;
  }
  if (group.memberNames && group.memberNames.length > 0) {
    chunk += ` Members (${group.memberNames.length}): ${group.memberNames.join(', ')}.`;
  }
  if (group.totalExpenses !== undefined && group.totalExpenses > 0) {
    chunk += ` Cumulative Expenses: ₹${group.totalExpenses.toFixed(2)}.`;
  }
  if (group.budgetLimit && group.budgetLimit > 0) {
    chunk += ` Monthly Budget Limit: ₹${group.budgetLimit.toFixed(2)}.`;
  }
  return chunk;
}

export const buildGroupChunk = buildGroupMetaChunk;

export function buildBalanceSnapshotChunk(data: {
  groupName?: string;
  userName: string;
  netBalance: number;
  youAreOwed?: Array<{ name: string; amount: number }>;
  youOwe?: Array<{ name: string; amount: number }>;
}): string {
  const scope = data.groupName ? `in group "${data.groupName}"` : 'overall';
  const status = data.netBalance > 0.01
    ? `is owed ₹${data.netBalance.toFixed(2)} in net`
    : data.netBalance < -0.01
    ? `owes ₹${Math.abs(data.netBalance).toFixed(2)} in net`
    : 'is all settled up (₹0.00)';

  let chunk = `Balance Summary: Member ${data.userName} ${status} ${scope}.`;
  if (data.youAreOwed && data.youAreOwed.length > 0) {
    chunk += ` People who owe ${data.userName}: ${data.youAreOwed.map((o) => `${o.name} (₹${o.amount.toFixed(2)})`).join(', ')}.`;
  }
  if (data.youOwe && data.youOwe.length > 0) {
    chunk += ` People ${data.userName} owes: ${data.youOwe.map((o) => `${o.name} (₹${o.amount.toFixed(2)})`).join(', ')}.`;
  }
  return chunk;
}

export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return 'No prior expense records found directly matching this inquiry.';
  }

  return chunks
    .map((chunk, index) => `[Record ${index + 1}] (${chunk.entityType.toUpperCase()}): ${chunk.textChunk}`)
    .join('\n');
}
