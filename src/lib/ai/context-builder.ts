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

export function buildGroupChunk(group: {
  name: string;
  description?: string;
  memberNames?: string[];
}): string {
  let chunk = `Group: "${group.name}".`;
  if (group.description) {
    chunk += ` Description: ${group.description}.`;
  }
  if (group.memberNames && group.memberNames.length > 0) {
    chunk += ` Members: ${group.memberNames.join(', ')}.`;
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
