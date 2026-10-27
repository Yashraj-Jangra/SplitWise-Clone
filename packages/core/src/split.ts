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
 * Rounds each amount to 2 decimals, then hands out the leftover pennies/cents
 * using the largest-remainder method (stable sort) so the result sums exactly to `total`.
 * When fractional differences are tied, leftover pennies are allocated starting at `preferredIdx` (payer priority).
 */
export function reconcileToTotal(amounts: number[], total: number, preferredIdx = 0): number[] {
  if (amounts.length === 0) return [];
  const rounded = amounts.map(round2);
  const remainder = round2(total - rounded.reduce((s, a) => s + a, 0));
  if (remainder !== 0) {
    const pennies = Math.round(Math.abs(remainder) * 100);
    const step = 0.01 * Math.sign(remainder);
    const safePref = preferredIdx >= 0 && preferredIdx < amounts.length ? preferredIdx : 0;
    
    // Sort indices by largest fractional difference so the highest fractional share gets adjusted first.
    // When fractional differences are equal (e.g. equal split), prioritize safePref (payer priority).
    const diffs = amounts.map((a, idx) => ({
      idx,
      diff: step > 0 ? (a - rounded[idx]) : (rounded[idx] - a),
    }));
    diffs.sort((a, b) => {
      const delta = b.diff - a.diff;
      if (Math.abs(delta) > 1e-5) {
        return delta;
      }
      if (a.idx === safePref) return -1;
      if (b.idx === safePref) return 1;
      return a.idx - b.idx;
    });

    for (let i = 0; i < pennies; i++) {
      const targetIdx = diffs[i % diffs.length].idx;
      rounded[targetIdx] = round2(rounded[targetIdx] + step);
    }
  }
  return rounded;
}

/**
 * Calculates equal percentage allocations that sum EXACTLY to 100.00%,
 * adjusting any fractional penny remainders starting at `preferredIdx` (payer priority).
 * e.g. for count=3, preferredIdx=0: [33.34, 33.33, 33.33] -> sum = 100.00%
 */
export function calculateEqualPercentages(count: number, preferredIdx = 0): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  const totalPoints = 10000; // 100.00%
  const basePoints = Math.floor(totalPoints / count);
  const remainderPoints = totalPoints - basePoints * count;

  const result = Array(count).fill(basePoints / 100);
  const safePref = preferredIdx >= 0 && preferredIdx < count ? preferredIdx : 0;
  for (let i = 0; i < remainderPoints; i++) {
    const idx = (safePref + i) % count;
    result[idx] = parseFloat(((basePoints + 1) / 100).toFixed(2));
  }
  return result;
}

/**
 * Calculates equal currency splits that sum EXACTLY to `totalAmount`,
 * adjusting any fractional penny remainders starting at `preferredIdx` (payer priority).
 * e.g. for totalAmount=1000, count=3, preferredIdx=0: [333.34, 333.33, 333.33] -> sum = 1000.00
 */
export function calculateEqualAmounts(totalAmount: number, count: number, preferredIdx = 0): number[] {
  if (count <= 0) return [];
  if (totalAmount <= 0) return Array(count).fill(0);
  if (count === 1) return [parseFloat(totalAmount.toFixed(2))];

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  const result = Array(count).fill(baseCents / 100);
  const safePref = preferredIdx >= 0 && preferredIdx < count ? preferredIdx : 0;
  for (let i = 0; i < remainderCents; i++) {
    const idx = (safePref + i) % count;
    result[idx] = parseFloat(((baseCents + 1) / 100).toFixed(2));
  }
  return result;
}

/**
 * Calculates percentage allocations from weighted shares that sum EXACTLY to 100.00%,
 * adjusting any fractional remainders so that all percentages are 2 decimals.
 * e.g. for shares=[1, 1, 1], preferredIdx=0: [33.34, 33.33, 33.33] -> sum = 100.00%
 */
export function calculateSharesPercentages(shares: number[], preferredIdx = 0): number[] {
  if (shares.length === 0) return [];
  const totalShares = shares.reduce((sum, s) => sum + (Number(s) || 0), 0);
  if (totalShares <= 0) return Array(shares.length).fill(0);
  const raw = shares.map((s) => (100 * (Number(s) || 0)) / totalShares);
  return reconcileToTotal(raw, 100, preferredIdx);
}

/**
 * Calculates percentage allocations from currency amounts that sum EXACTLY to 100.00%
 * when total owed equals totalAmount (or calculates 2-decimal percentages otherwise).
 */
export function calculateAmountsPercentages(
  amounts: number[],
  totalAmount: number,
  preferredIdx = 0
): number[] {
  if (amounts.length === 0) return [];
  if (totalAmount <= 0) return Array(amounts.length).fill(0);
  const raw = amounts.map((a) => (100 * (Number(a) || 0)) / totalAmount);
  const sumAmounts = amounts.reduce((sum, a) => sum + (Number(a) || 0), 0);
  if (Math.abs(sumAmounts - totalAmount) <= TOLERANCE) {
    return reconcileToTotal(raw, 100, preferredIdx);
  }
  return raw.map((r) => parseFloat(r.toFixed(2)));
}

/**
 * Computes each participant's allocated percentage for a split (summing to 100.00% when balanced).
 * Unselected participants have 0.
 */
export function calculateSplitPercentages(
  totalAmount: number,
  participants: SplitParticipantInput[],
  splitType: SplitType,
  payerId?: string
): Record<string, number> {
  const selected = participants.filter((p) => p.selected);
  const n = selected.length;
  if (n === 0) {
    return Object.fromEntries(participants.map((p) => [p.userId, 0]));
  }

  const payerIdx = payerId ? selected.findIndex((p) => p.userId === payerId) : -1;
  const preferredIdx = payerIdx >= 0 ? payerIdx : 0;

  if (splitType === 'by_percentage') {
    return Object.fromEntries(
      participants.map((p) => [
        p.userId,
        p.selected ? parseFloat((Number(p.percentage) || 0).toFixed(2)) : 0,
      ])
    );
  }

  if (splitType === 'by_shares') {
    const sharesArr = selected.map((p) => Number(p.shares) || 1);
    const pcts = calculateSharesPercentages(sharesArr, preferredIdx);
    let idx = 0;
    return Object.fromEntries(
      participants.map((p) => [
        p.userId,
        p.selected ? pcts[idx++] : 0,
      ])
    );
  }

  if (splitType === 'unequally') {
    const amountsArr = selected.map((p) => Number(p.amountOwed) || 0);
    const pcts = calculateAmountsPercentages(amountsArr, totalAmount, preferredIdx);
    let idx = 0;
    return Object.fromEntries(
      participants.map((p) => [
        p.userId,
        p.selected ? pcts[idx++] : 0,
      ])
    );
  }

  // equally:
  const raw = Array(n).fill(100 / n);
  const pcts = reconcileToTotal(raw, 100, preferredIdx);
  let idx = 0;
  return Object.fromEntries(
    participants.map((p) => [
      p.userId,
      p.selected ? pcts[idx++] : 0,
    ])
  );
}

/**
 * Computes each participant's owed amount for a split. Unselected participants owe 0.
 * For `unequally`, the entered amounts are kept as-is (validated separately).
 * When `payerId` is provided, equal splits and ties allocate the remainder penny to the payer.
 * In `by_percentage`, equal percentage partitions (e.g. 33.33%, 33.33%, 33.34%) are detected
 * and partitioned by `totalAmount / n` to eliminate floating-point penny loss (e.g. 333.33 vs 333.30).
 */
export function calculateSplitAmounts(
  totalAmount: number,
  participants: SplitParticipantInput[],
  splitType: SplitType,
  payerId?: string
): SplitResult[] {
  const selected = participants.filter((p) => p.selected);
  const n = selected.length;

  if (totalAmount <= 0 || n === 0) {
    return participants.map((p) => ({ userId: p.userId, amountOwed: 0 }));
  }

  if (splitType === 'unequally') {
    return participants.map((p) => ({
      userId: p.userId,
      amountOwed: p.selected ? parseFloat((Number(p.amountOwed) || 0).toFixed(2)) : 0,
    }));
  }

  const payerIdx = payerId ? selected.findIndex((p) => p.userId === payerId) : -1;
  const preferredIdx = payerIdx >= 0 ? payerIdx : 0;

  let raw: number[];
  if (splitType === 'by_shares') {
    const totalShares = selected.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
    raw = totalShares > 0
      ? selected.map((p) => (totalAmount * (Number(p.shares) || 0)) / totalShares)
      : Array(n).fill(0);
  } else if (splitType === 'by_percentage') {
    const totalPct = selected.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
    const isNear100 = Math.abs(totalPct - 100) <= TOLERANCE;
    const isEqualPartition =
      isNear100 &&
      selected.every((p) => Math.abs((Number(p.percentage) || 0) - 100 / n) <= 0.15);

    if (isEqualPartition) {
      raw = Array(n).fill(totalAmount / n);
    } else {
      raw = selected.map((p) => (totalAmount * (Number(p.percentage) || 0)) / 100);
    }
  } else {
    raw = Array(n).fill(totalAmount / n);
  }

  const reconciled = reconcileToTotal(raw, totalAmount, preferredIdx);
  let i = 0;
  return participants.map((p) =>
    p.selected
      ? { userId: p.userId, amountOwed: reconciled[i++] }
      : { userId: p.userId, amountOwed: 0 }
  );
}

export type SplitValidationError =
  | { field: 'payers'; totalPaid: number; totalAmount: number; message?: string }
  | { field: 'participants'; kind: 'amounts'; totalOwed: number; totalAmount: number; message?: string }
  | { field: 'participants'; kind: 'percentage'; totalPercentage: number; message?: string };

const TOLERANCE = 0.01;

/**
 * Validates multi-payer totals and manual/percentage splits before submit.
 * Checks for non-negative values, finite numbers, and exact balances.
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
    for (const a of multiPayerAmounts) {
      const num = Number(a);
      if (!Number.isFinite(num) || num < 0) {
        return { field: 'payers', totalPaid: -1, totalAmount, message: 'Payer amounts cannot be negative.' };
      }
    }
    const totalPaid = multiPayerAmounts.reduce((acc, a) => acc + (Number(a) || 0), 0);
    if (Math.abs(totalPaid - totalAmount) > TOLERANCE) {
      return { field: 'payers', totalPaid, totalAmount };
    }
  }

  const selected = participants.filter((p) => p.selected);

  if (splitType === 'unequally') {
    for (const p of selected) {
      const num = Number(p.amountOwed);
      if (!Number.isFinite(num) || num < 0) {
        return { field: 'participants', kind: 'amounts', totalOwed: -1, totalAmount, message: 'Participant amounts cannot be negative.' };
      }
    }
    const totalOwed = selected.reduce((acc, p) => acc + (Number(p.amountOwed) || 0), 0);
    if (Math.abs(totalOwed - totalAmount) > TOLERANCE) {
      return { field: 'participants', kind: 'amounts', totalOwed, totalAmount };
    }
  }

  if (splitType === 'by_percentage') {
    for (const p of selected) {
      const num = Number(p.percentage);
      if (!Number.isFinite(num) || num < 0) {
        return { field: 'participants', kind: 'percentage', totalPercentage: -1, message: 'Percentages cannot be negative.' };
      }
    }
    const totalPercentage = selected.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > TOLERANCE) {
      return { field: 'participants', kind: 'percentage', totalPercentage };
    }
  }

  if (splitType === 'by_shares') {
    for (const p of selected) {
      const num = Number(p.shares);
      if (!Number.isFinite(num) || num <= 0) {
        return { field: 'participants', kind: 'amounts', totalOwed: 0, totalAmount, message: 'Shares must be greater than zero.' };
      }
    }
  }

  return null;
}
