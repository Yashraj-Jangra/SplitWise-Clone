import { describe, it, expect } from 'vitest';

// Pure representation of the expense-splitting business logic
export function calculateSplitAmounts(
  totalAmount: number,
  participants: { userId: string; selected: boolean; shares?: number; percentage?: number; amountOwed?: number }[],
  splitType: 'equally' | 'unequally' | 'by_shares' | 'by_percentage'
): { userId: string; amountOwed: number }[] {
  const selectedParticipants = participants.filter(p => p.selected);
  const numSelected = selectedParticipants.length;

  if (totalAmount <= 0 || numSelected === 0) {
    return participants.map(p => ({ userId: p.userId, amountOwed: 0 }));
  }

  let amounts: number[] = [];

  if (splitType === 'equally') {
    amounts = Array(numSelected).fill(totalAmount / numSelected);
  } else if (splitType === 'by_shares') {
    const totalShares = selectedParticipants.reduce((sum, p) => sum + (p.shares || 0), 0);
    if (totalShares > 0) {
      amounts = selectedParticipants.map(p => (totalAmount * (p.shares || 0)) / totalShares);
    } else {
      amounts = Array(numSelected).fill(0);
    }
  } else if (splitType === 'by_percentage') {
    amounts = selectedParticipants.map(p => (totalAmount * (p.percentage || 0)) / 100);
  } else { // unequally
    return participants.map(p => ({
      userId: p.userId,
      amountOwed: p.selected ? (p.amountOwed || 0) : 0
    }));
  }

  // Correct for rounding errors (to 2 decimal places)
  const roundedAmounts = amounts.map(a => parseFloat(a.toFixed(2)));
  const sumOfRounded = roundedAmounts.reduce((s, a) => s + a, 0);
  const remainder = parseFloat((totalAmount - sumOfRounded).toFixed(2));

  if (Math.abs(remainder) > 0) {
    // Add or subtract pennies to/from participants to exact total matches
    const absolutePennies = Math.round(Math.abs(remainder) * 100);
    const sign = Math.sign(remainder);
    for (let i = 0; i < absolutePennies; i++) {
      roundedAmounts[i % numSelected] += 0.01 * sign;
    }
  }

  let roundedIndex = 0;
  return participants.map(p => {
    if (p.selected) {
      const amt = parseFloat(roundedAmounts[roundedIndex].toFixed(2));
      roundedIndex++;
      return { userId: p.userId, amountOwed: amt };
    } else {
      return { userId: p.userId, amountOwed: 0 };
    }
  });
}

describe('Expense Splitting Calculations', () => {
  it('splits equally without remainder', () => {
    const participants = [
      { userId: 'u1', selected: true },
      { userId: 'u2', selected: true },
      { userId: 'u3', selected: true },
    ];
    const results = calculateSplitAmounts(300, participants, 'equally');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 100 },
      { userId: 'u2', amountOwed: 100 },
      { userId: 'u3', amountOwed: 100 },
    ]);
  });

  it('splits equally and adjusts penny remainder correctly', () => {
    const participants = [
      { userId: 'u1', selected: true },
      { userId: 'u2', selected: true },
      { userId: 'u3', selected: true },
    ];
    // 100 / 3 = 33.33333... Total needs to be 100.00
    // Sum of 33.33 + 33.33 + 33.33 = 99.99
    // Remainder is 0.01. The first participant should get the extra penny.
    const results = calculateSplitAmounts(100, participants, 'equally');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 33.34 },
      { userId: 'u2', amountOwed: 33.33 },
      { userId: 'u3', amountOwed: 33.33 },
    ]);
  });

  it('splits by shares correctly', () => {
    const participants = [
      { userId: 'u1', selected: true, shares: 1 },
      { userId: 'u2', selected: true, shares: 2 },
      { userId: 'u3', selected: true, shares: 3 },
    ];
    // Total amount = 600. Total shares = 6.
    // u1 = 100, u2 = 200, u3 = 300
    const results = calculateSplitAmounts(600, participants, 'by_shares');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 100 },
      { userId: 'u2', amountOwed: 200 },
      { userId: 'u3', amountOwed: 300 },
    ]);
  });

  it('splits by shares with penny rounding correction', () => {
    const participants = [
      { userId: 'u1', selected: true, shares: 1 },
      { userId: 'u2', selected: true, shares: 2 },
    ];
    // Total = 10.00. Total shares = 3.
    // u1 (1 share) = 3.33, u2 (2 shares) = 6.67 (sums perfectly to 10.00)
    const results = calculateSplitAmounts(10, participants, 'by_shares');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 3.33 },
      { userId: 'u2', amountOwed: 6.67 },
    ]);
  });

  it('splits by percentage correctly', () => {
    const participants = [
      { userId: 'u1', selected: true, percentage: 25 },
      { userId: 'u2', selected: true, percentage: 75 },
    ];
    const results = calculateSplitAmounts(400, participants, 'by_percentage');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 100 },
      { userId: 'u2', amountOwed: 300 },
    ]);
  });

  it('does not split for unselected participants', () => {
    const participants = [
      { userId: 'u1', selected: true },
      { userId: 'u2', selected: false },
      { userId: 'u3', selected: true },
    ];
    const results = calculateSplitAmounts(10, participants, 'equally');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 5.00 },
      { userId: 'u2', amountOwed: 0.00 },
      { userId: 'u3', amountOwed: 5.00 },
    ]);
  });
});
