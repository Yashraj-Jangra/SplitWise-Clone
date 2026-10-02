export type SplitType = 'equally' | 'unequally' | 'by_shares' | 'by_percentage';

export interface SplitParticipantInput {
  userId: string;
  selected: boolean;
  shares?: number;
  percentage?: number;
  amountOwed?: number;
}

export interface SplitResult {
  userId: string;
  amountOwed: number;
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

/**
 * Rounds each amount to 2 decimals, then hands out the leftover pennies
 * round-robin so the result sums exactly to `total`.
 */
export function reconcileToTotal(amounts: number[], total: number): number[] {
  if (amounts.length === 0) return [];
  const rounded = amounts.map(round2);
  const remainder = round2(total - rounded.reduce((s, a) => s + a, 0));
  if (remainder !== 0) {
    const pennies = Math.round(Math.abs(remainder) * 100);
    const step = 0.01 * Math.sign(remainder);
    for (let i = 0; i < pennies; i++) {
      const idx = i % rounded.length;
      rounded[idx] = round2(rounded[idx] + step);
    }
  }
  return rounded;
}

/**
 * Computes each participant's owed amount for a split. Unselected participants owe 0.
 * For `unequally`, the entered amounts are kept as-is (validated separately).
 */
export function calculateSplitAmounts(
  totalAmount: number,
  participants: SplitParticipantInput[],
  splitType: SplitType
): SplitResult[] {
  const selected = participants.filter((p) => p.selected);
  const n = selected.length;

  if (totalAmount <= 0 || n === 0) {
    return participants.map((p) => ({ userId: p.userId, amountOwed: 0 }));
  }

  if (splitType === 'unequally') {
    return participants.map((p) => ({
      userId: p.userId,
      amountOwed: p.selected ? Number(p.amountOwed) || 0 : 0,
    }));
  }

  let raw: number[];
  if (splitType === 'by_shares') {
    const totalShares = selected.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
    raw = totalShares > 0
      ? selected.map((p) => (totalAmount * (Number(p.shares) || 0)) / totalShares)
      : Array(n).fill(0);
  } else if (splitType === 'by_percentage') {
    raw = selected.map((p) => (totalAmount * (Number(p.percentage) || 0)) / 100);
  } else {
    raw = Array(n).fill(totalAmount / n);
  }

  const reconciled = reconcileToTotal(raw, totalAmount);
  let i = 0;
  return participants.map((p) =>
    p.selected
      ? { userId: p.userId, amountOwed: reconciled[i++] }
      : { userId: p.userId, amountOwed: 0 }
  );
}

export type SplitValidationError =
  | { field: 'payers'; totalPaid: number; totalAmount: number }
  | { field: 'participants'; kind: 'amounts'; totalOwed: number; totalAmount: number }
  | { field: 'participants'; kind: 'percentage'; totalPercentage: number };

const TOLERANCE = 0.01;

/**
 * Validates multi-payer totals and manual/percentage splits before submit.
 * Returns null when valid.
 */
export function validateSplit(input: {
  totalAmount: number;
  splitType: SplitType;
  participants: SplitParticipantInput[];
  multiPayerAmounts?: number[];
}): SplitValidationError | null {
  const { totalAmount, splitType, participants, multiPayerAmounts } = input;

  if (multiPayerAmounts) {
    const totalPaid = multiPayerAmounts.reduce((acc, a) => acc + (Number(a) || 0), 0);
    if (Math.abs(totalPaid - totalAmount) > TOLERANCE) {
      return { field: 'payers', totalPaid, totalAmount };
    }
  }

  const selected = participants.filter((p) => p.selected);
  if (splitType === 'unequally') {
    const totalOwed = selected.reduce((acc, p) => acc + (Number(p.amountOwed) || 0), 0);
    if (Math.abs(totalOwed - totalAmount) > TOLERANCE) {
      return { field: 'participants', kind: 'amounts', totalOwed, totalAmount };
    }
  }
  if (splitType === 'by_percentage') {
    const totalPercentage = selected.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > TOLERANCE) {
      return { field: 'participants', kind: 'percentage', totalPercentage };
    }
  }
  return null;
}
