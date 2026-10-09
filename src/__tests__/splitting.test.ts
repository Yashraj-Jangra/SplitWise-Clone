import { describe, it, expect } from 'vitest';
import { calculateSplitAmounts, validateSplit } from '@splitit/core';

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

  it('keeps entered amounts as-is for unequally split', () => {
    const participants = [
      { userId: 'u1', selected: true, amountOwed: 45.5 },
      { userId: 'u2', selected: true, amountOwed: 54.5 },
      { userId: 'u3', selected: false, amountOwed: 99 },
    ];
    const results = calculateSplitAmounts(100, participants, 'unequally');
    expect(results).toEqual([
      { userId: 'u1', amountOwed: 45.5 },
      { userId: 'u2', amountOwed: 54.5 },
      { userId: 'u3', amountOwed: 0 },
    ]);
  });

  describe('validateSplit', () => {
    it('validates multi-payer amounts matching total', () => {
      const result = validateSplit({
        totalAmount: 150,
        splitType: 'equally',
        participants: [{ userId: 'u1', selected: true }],
        multiPayerAmounts: [50, 100],
      });
      expect(result).toBeNull();
    });

    it('rejects multi-payer amounts when sum does not equal total', () => {
      const result = validateSplit({
        totalAmount: 150,
        splitType: 'equally',
        participants: [{ userId: 'u1', selected: true }],
        multiPayerAmounts: [50, 80],
      });
      expect(result).toEqual({
        field: 'payers',
        totalPaid: 130,
        totalAmount: 150,
      });
    });

    it('validates unequal split amounts matching total', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'unequally',
        participants: [
          { userId: 'u1', selected: true, amountOwed: 40 },
          { userId: 'u2', selected: true, amountOwed: 60 },
          { userId: 'u3', selected: false, amountOwed: 100 },
        ],
      });
      expect(result).toBeNull();
    });

    it('rejects unequal split amounts not matching total', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'unequally',
        participants: [
          { userId: 'u1', selected: true, amountOwed: 40 },
          { userId: 'u2', selected: true, amountOwed: 50 },
        ],
      });
      expect(result).toEqual({
        field: 'participants',
        kind: 'amounts',
        totalOwed: 90,
        totalAmount: 100,
      });
    });

    it('validates percentage split summing to 100%', () => {
      const result = validateSplit({
        totalAmount: 250,
        splitType: 'by_percentage',
        participants: [
          { userId: 'u1', selected: true, percentage: 33.33 },
          { userId: 'u2', selected: true, percentage: 66.67 },
        ],
      });
      expect(result).toBeNull();
    });

    it('rejects percentage split not summing to 100%', () => {
      const result = validateSplit({
        totalAmount: 250,
        splitType: 'by_percentage',
        participants: [
          { userId: 'u1', selected: true, percentage: 50 },
          { userId: 'u2', selected: true, percentage: 40 },
        ],
      });
      expect(result).toEqual({
        field: 'participants',
        kind: 'percentage',
        totalPercentage: 90,
      });
    });
  });
});
