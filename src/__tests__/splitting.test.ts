import { describe, it, expect } from 'vitest';
import {
  calculateSplitAmounts,
  validateSplit,
  calculateEqualPercentages,
  calculateEqualAmounts,
  calculateSharesPercentages,
  calculateAmountsPercentages,
  calculateSplitPercentages,
} from '@splitit/core';

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

    it('validates 3-way split with 33.34, 33.33, 33.33 summing to exactly 100%', () => {
      const percentages = calculateEqualPercentages(3); // [33.34, 33.33, 33.33] with payer priority
      expect(percentages).toEqual([33.34, 33.33, 33.33]);
      const totalPct = percentages.reduce((acc, p) => acc + p, 0);
      expect(parseFloat(totalPct.toFixed(2))).toBe(100.00);

      const validation = validateSplit({
        totalAmount: 1000,
        splitType: 'by_percentage',
        participants: [
          { userId: 'u1', selected: true, percentage: percentages[0] },
          { userId: 'u2', selected: true, percentage: percentages[1] },
          { userId: 'u3', selected: true, percentage: percentages[2] },
        ],
      });
      expect(validation).toBeNull();
    });

    it('rejects negative or invalid multi-payer amounts', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'equally',
        participants: [
          { userId: 'u1', selected: true },
          { userId: 'u2', selected: true },
        ],
        multiPayerAmounts: [-50, 150],
      });
      expect(result).toEqual({
        field: 'payers',
        totalPaid: -1,
        totalAmount: 100,
        message: 'Payer amounts cannot be negative.',
      });
    });

    it('rejects negative participant amounts in unequal splits', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'unequally',
        participants: [
          { userId: 'u1', selected: true, amountOwed: -20 },
          { userId: 'u2', selected: true, amountOwed: 120 },
        ],
      });
      expect(result).toEqual({
        field: 'participants',
        kind: 'amounts',
        totalOwed: -1,
        totalAmount: 100,
        message: 'Participant amounts cannot be negative.',
      });
    });

    it('rejects negative percentages in percentage splits', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'by_percentage',
        participants: [
          { userId: 'u1', selected: true, percentage: -10 },
          { userId: 'u2', selected: true, percentage: 110 },
        ],
      });
      expect(result).toEqual({
        field: 'participants',
        kind: 'percentage',
        totalPercentage: -1,
        message: 'Percentages cannot be negative.',
      });
    });

    it('rejects non-positive shares in by_shares split', () => {
      const result = validateSplit({
        totalAmount: 100,
        splitType: 'by_shares',
        participants: [
          { userId: 'u1', selected: true, shares: 0 },
          { userId: 'u2', selected: true, shares: 2 },
        ],
      });
      expect(result).toEqual({
        field: 'participants',
        kind: 'amounts',
        totalOwed: 0,
        totalAmount: 100,
        message: 'Shares must be greater than zero.',
      });
    });
  });

  describe('Equal Split Helpers (Penny & Percent Allocation with Payer Priority)', () => {
    it('calculates equal percentages summing to exactly 100.00% across all participant counts with payer priority', () => {
      // 3 people (payer at index 0 by default): [33.34, 33.33, 33.33]
      const p3 = calculateEqualPercentages(3);
      expect(p3).toEqual([33.34, 33.33, 33.33]);
      expect(p3.reduce((s, p) => s + p, 0)).toBeCloseTo(100.00, 5);

      // 3 people with payer at index 2: [33.33, 33.33, 33.34]
      const p3WithPayer2 = calculateEqualPercentages(3, 2);
      expect(p3WithPayer2).toEqual([33.33, 33.33, 33.34]);
      expect(p3WithPayer2.reduce((s, p) => s + p, 0)).toBeCloseTo(100.00, 5);

      // 2 people: 50, 50
      expect(calculateEqualPercentages(2)).toEqual([50, 50]);

      // 4 people: 25, 25, 25, 25
      expect(calculateEqualPercentages(4)).toEqual([25, 25, 25, 25]);

      // 6 people: 16.67 * 4 + 16.66 * 2 = 100.00
      const p6 = calculateEqualPercentages(6);
      expect(p6).toEqual([16.67, 16.67, 16.67, 16.67, 16.66, 16.66]);
      expect(parseFloat(p6.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // 7 people: 14.29 * 4 + 14.28 * 3 = 100.00
      const p7 = calculateEqualPercentages(7);
      expect(p7).toEqual([14.29, 14.29, 14.29, 14.29, 14.28, 14.28, 14.28]);
      expect(parseFloat(p7.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // Edge cases
      expect(calculateEqualPercentages(1)).toEqual([100]);
      expect(calculateEqualPercentages(0)).toEqual([]);
    });

    it('calculates equal currency amounts summing to exactly totalAmount with payer priority', () => {
      // 1000 across 3 people (payer at index 0): 333.34, 333.33, 333.33
      const a3 = calculateEqualAmounts(1000, 3, 0);
      expect(a3).toEqual([333.34, 333.33, 333.33]);
      expect(a3.reduce((s, a) => s + a, 0)).toBe(1000.00);

      // 1000 across 3 people with payer at index 2: 333.33, 333.33, 333.34
      const a3Payer2 = calculateEqualAmounts(1000, 3, 2);
      expect(a3Payer2).toEqual([333.33, 333.33, 333.34]);
      expect(a3Payer2.reduce((s, a) => s + a, 0)).toBe(1000.00);

      // 100 across 3 people: 33.34, 33.33, 33.33
      const a100 = calculateEqualAmounts(100, 3);
      expect(a100).toEqual([33.34, 33.33, 33.33]);
      expect(a100.reduce((s, a) => s + a, 0)).toBe(100.00);

      // 10 across 3 people: 3.34, 3.33, 3.33
      const a10 = calculateEqualAmounts(10, 3);
      expect(a10).toEqual([3.34, 3.33, 3.33]);
      expect(a10.reduce((s, a) => s + a, 0)).toBe(10.00);

      // Edge cases
      expect(calculateEqualAmounts(0, 3)).toEqual([0, 0, 0]);
      expect(calculateEqualAmounts(50, 1)).toEqual([50]);
      expect(calculateEqualAmounts(100, 0)).toEqual([]);
    });

    it('ensures percentage split amounts owed match total exactly without floating-point loss (fixing 333.33 vs 333.30 bug)', () => {
      // For 1000 across 3 people with percentages [33.34, 33.33, 33.33], each person should owe 333.33
      // and the payer gets the 1-cent penny adjustment (333.34), never 333.30!
      const percentages = calculateEqualPercentages(3, 0); // [33.34, 33.33, 33.33]
      const results = calculateSplitAmounts(1000, [
        { userId: 'u1', selected: true, percentage: percentages[0] },
        { userId: 'u2', selected: true, percentage: percentages[1] },
        { userId: 'u3', selected: true, percentage: percentages[2] },
      ], 'by_percentage', 'u1');

      expect(results).toEqual([
        { userId: 'u1', amountOwed: 333.34 },
        { userId: 'u2', amountOwed: 333.33 },
        { userId: 'u3', amountOwed: 333.33 },
      ]);
      const totalOwed = results.reduce((acc, r) => acc + r.amountOwed, 0);
      expect(totalOwed).toBe(1000.00);

      // If u3 is the payer, u3 receives the penny adjustment 333.34
      const resultsPayer3 = calculateSplitAmounts(1000, [
        { userId: 'u1', selected: true, percentage: 33.33 },
        { userId: 'u2', selected: true, percentage: 33.33 },
        { userId: 'u3', selected: true, percentage: 33.34 },
      ], 'by_percentage', 'u3');

      expect(resultsPayer3).toEqual([
        { userId: 'u1', amountOwed: 333.33 },
        { userId: 'u2', amountOwed: 333.33 },
        { userId: 'u3', amountOwed: 333.34 },
      ]);
      expect(resultsPayer3.reduce((acc, r) => acc + r.amountOwed, 0)).toBe(1000.00);
    });

    it('calculates shares percentages summing to exactly 100.00% with 2 decimal precision', () => {
      // 3 people with 1 share each: exactly [33.34, 33.33, 33.33] summing to 100.00%
      const p3 = calculateSharesPercentages([1, 1, 1]);
      expect(p3).toEqual([33.34, 33.33, 33.33]);
      expect(parseFloat(p3.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // 2 people with 1 and 2 shares: [33.33, 66.67]
      const p12 = calculateSharesPercentages([1, 2]);
      expect(p12).toEqual([33.33, 66.67]);
      expect(parseFloat(p12.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // 3 people with 1, 2, 3 shares: [16.67, 33.33, 50.00]
      const p123 = calculateSharesPercentages([1, 2, 3]);
      expect(p123).toEqual([16.67, 33.33, 50.00]);
      expect(parseFloat(p123.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // Edge cases
      expect(calculateSharesPercentages([])).toEqual([]);
      expect(calculateSharesPercentages([0, 0])).toEqual([0, 0]);
    });

    it('calculates amounts percentages summing to 100.00% for balanced splits', () => {
      // For 100.00: 33.33, 33.33, 33.34 -> exactly [33.33, 33.33, 33.34]
      const p100 = calculateAmountsPercentages([33.33, 33.33, 33.34], 100);
      expect(p100).toEqual([33.33, 33.33, 33.34]);
      expect(parseFloat(p100.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // For 1000.00: 333.33, 333.33, 333.34 -> sums to 100.00%
      const p1000 = calculateAmountsPercentages([333.33, 333.33, 333.34], 1000);
      expect(p1000).toEqual([33.33, 33.33, 33.34]);
      expect(parseFloat(p1000.reduce((s, p) => s + p, 0).toFixed(2))).toBe(100.00);

      // Partial / unbalanced input keeps 2-decimal format without forcing 100%
      const partial = calculateAmountsPercentages([50], 100);
      expect(partial).toEqual([50]);
    });

    it('calculates unified split percentages across equally, by_shares, by_percentage, and unequally', () => {
      const participants = [
        { userId: 'u1', selected: true, shares: 1, percentage: 33.33, amountOwed: 33.33 },
        { userId: 'u2', selected: true, shares: 1, percentage: 33.33, amountOwed: 33.33 },
        { userId: 'u3', selected: true, shares: 1, percentage: 33.34, amountOwed: 33.34 },
        { userId: 'u4', selected: false, shares: 1, percentage: 0, amountOwed: 0 },
      ];

      // 1. Equally: sums to 100.00%, u4 is 0
      const eqPcts = calculateSplitPercentages(100, participants, 'equally');
      expect(eqPcts.u4).toBe(0);
      const eqSum = eqPcts.u1 + eqPcts.u2 + eqPcts.u3;
      expect(parseFloat(eqSum.toFixed(2))).toBe(100.00);

      // 2. By shares: sums to 100.00%
      const shPcts = calculateSplitPercentages(100, participants, 'by_shares');
      expect(shPcts.u4).toBe(0);
      const shSum = shPcts.u1 + shPcts.u2 + shPcts.u3;
      expect(parseFloat(shSum.toFixed(2))).toBe(100.00);

      // 3. By percentage: sums to 100.00%
      const pctPcts = calculateSplitPercentages(100, participants, 'by_percentage');
      expect(pctPcts).toEqual({ u1: 33.33, u2: 33.33, u3: 33.34, u4: 0 });

      // 4. Unequally: sums to 100.00%
      const unPcts = calculateSplitPercentages(100, participants, 'unequally');
      expect(unPcts).toEqual({ u1: 33.33, u2: 33.33, u3: 33.34, u4: 0 });
    });

    it('allocates the penny remainder to the payer across equal and shares splits', () => {
      const participants = [
        { userId: 'u1', selected: true, shares: 1 },
        { userId: 'u2', selected: true, shares: 1 },
        { userId: 'u3', selected: true, shares: 1 },
      ];

      // Equal split with payer u2: u2 gets 33.34
      const eqResults = calculateSplitAmounts(100, participants, 'equally', 'u2');
      expect(eqResults).toEqual([
        { userId: 'u1', amountOwed: 33.33 },
        { userId: 'u2', amountOwed: 33.34 },
        { userId: 'u3', amountOwed: 33.33 },
      ]);

      // Shares split with payer u3: u3 gets 33.34
      const shResults = calculateSplitAmounts(100, participants, 'by_shares', 'u3');
      expect(shResults).toEqual([
        { userId: 'u1', amountOwed: 33.33 },
        { userId: 'u2', amountOwed: 33.33 },
        { userId: 'u3', amountOwed: 33.34 },
      ]);

      // Equal percentages with payer u2: u2 gets 33.34%
      const eqPcts = calculateSplitPercentages(100, participants, 'equally', 'u2');
      expect(eqPcts).toEqual({ u1: 33.33, u2: 33.34, u3: 33.33 });
    });
  });
});
