import { describe, it, expect } from 'vitest';
import { diffBudgetChanges } from '@/lib/services/budget-history.helper';
import type { GroupBudget } from '@/types';

describe('Budget History Diff Engine (diffBudgetChanges)', () => {
  it('Edge Case 1: handles brand new budget setup from scratch', () => {
    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
      alertThresholds: [75, 90, 100],
    };

    const diff = diffBudgetChanges(undefined, newBudget, 'Alice');

    expect(diff.hasChanges).toBe(true);
    expect(diff.newStatus).toBe('enabled');
    expect(diff.statusChanged).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(false);
    expect(diff.currentMonthlyLimit).toBe(25000);

    const statusChange = diff.changes.find((c) => c.field === 'Budget Tracking');
    expect(statusChange).toBeDefined();
    expect(statusChange?.from).toBe('Disabled');
    expect(statusChange?.to).toBe('Enabled');

    const limitChange = diff.changes.find((c) => c.field === 'Monthly Budget');
    expect(limitChange).toBeDefined();
    expect(limitChange?.type).toBe('added');
    expect(limitChange?.to).toBe('₹25,000');

    const catChange = diff.changes.find((c) => c.field === 'Category: Food and Drink');
    expect(catChange).toBeDefined();
    expect(catChange?.type).toBe('added');
    expect(catChange?.to).toBe('₹5,000');

    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange).toBeDefined();
    expect(poolChange?.to).toBe('₹20,000');

    expect(diff.description).toContain('Alice set up the group budget (₹25,000/month)');
  });

  it('Edge Case 2: handles disabling an existing budget', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        Housing: 10000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: false,
      monthlyLimit: 0,
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Bob');

    expect(diff.hasChanges).toBe(true);
    expect(diff.statusChanged).toBe(true);
    expect(diff.newStatus).toBe('disabled');
    expect(diff.monthlyBudgetUnchanged).toBe(false);

    const statusChange = diff.changes.find((c) => c.field === 'Budget Tracking');
    expect(statusChange?.from).toBe('Enabled');
    expect(statusChange?.to).toBe('Disabled');

    const limitChange = diff.changes.find((c) => c.field === 'Monthly Budget');
    expect(limitChange?.type).toBe('removed');
    expect(limitChange?.from).toBe('₹25,000');

    expect(diff.description).toBe('Bob disabled the group budget.');
  });

  it('Edge Case 3: handles re-enabling a disabled budget', () => {
    const oldBudget: GroupBudget = {
      enabled: false,
      monthlyLimit: 25000,
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Charlie');

    expect(diff.hasChanges).toBe(true);
    expect(diff.statusChanged).toBe(true);
    expect(diff.newStatus).toBe('enabled');
    expect(diff.monthlyBudgetUnchanged).toBe(true); // Total budget is identical at 25,000
    expect(diff.currentMonthlyLimit).toBe(25000);

    const statusChange = diff.changes.find((c) => c.field === 'Budget Tracking');
    expect(statusChange?.from).toBe('Disabled');
    expect(statusChange?.to).toBe('Enabled');
  });

  it('Edge Case 4: flags monthlyBudgetUnchanged=true when ONLY categories change and whole budget is identical', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
        Housing: 8000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 6000, // +1,000
        Housing: 8000, // unchanged
      },
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Alice');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(true); // Vital requirement
    expect(diff.currentMonthlyLimit).toBe(25000);

    // Monthly Budget must NOT be in changes (it did not change)
    expect(diff.changes.some((c) => c.field === 'Monthly Budget')).toBe(false);

    // Housing must NOT be in changes (it did not change)
    expect(diff.changes.some((c) => c.field === 'Category: Housing')).toBe(false);

    // Food and Drink changed
    const foodChange = diff.changes.find((c) => c.field === 'Category: Food and Drink');
    expect(foodChange).toBeDefined();
    expect(foodChange?.from).toBe('₹5,000');
    expect(foodChange?.to).toBe('₹6,000');

    // Flexible pool changed from 12,000 to 11,000
    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange).toBeDefined();
    expect(poolChange?.from).toBe('₹12,000');
    expect(poolChange?.to).toBe('₹11,000');

    expect(diff.description).toContain('Alice updated category allocations (monthly budget unchanged at ₹25,000)');
  });

  it('Edge Case 5: handles ONLY total monthly budget change while categories stay unchanged', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 30000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Bob');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(false);

    const limitChange = diff.changes.find((c) => c.field === 'Monthly Budget');
    expect(limitChange).toBeDefined();
    expect(limitChange?.from).toBe('₹25,000');
    expect(limitChange?.to).toBe('₹30,000');

    // Food and Drink must NOT be in changes
    expect(diff.changes.some((c) => c.field === 'Category: Food and Drink')).toBe(false);

    // Flexible pool updated from 20,000 to 25,000
    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange?.from).toBe('₹20,000');
    expect(poolChange?.to).toBe('₹25,000');

    expect(diff.description).toBe('Bob updated monthly budget from ₹25,000 to ₹30,000.');
  });

  it('Edge Case 6: handles AI auto-balanced compound reductions with parity', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        Housing: 8000,
        'Food and Drink': 5000,
        Shopping: 5000,
        Transportation: 3000,
        Entertainment: 2000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 22000,
      categoryLimits: {
        Housing: 7600,
        'Food and Drink': 4800,
        Shopping: 4800,
        Transportation: 2900,
        Entertainment: 1900,
      },
    };

    const aiSummary = 'Auto-balanced categories to fit ₹22,000';
    const diff = diffBudgetChanges(oldBudget, newBudget, 'Alice', true, aiSummary);

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(false);
    expect(diff.description).toContain('🤖 Alice approved an AI budget change: Auto-balanced categories to fit ₹22,000');

    const limitChange = diff.changes.find((c) => c.field === 'Monthly Budget');
    expect(limitChange?.from).toBe('₹25,000');
    expect(limitChange?.to).toBe('₹22,000');

    // All 5 categories changed
    expect(diff.changes.find((c) => c.field === 'Category: Housing')?.to).toBe('₹7,600');
    expect(diff.changes.find((c) => c.field === 'Category: Food and Drink')?.to).toBe('₹4,800');
    expect(diff.changes.find((c) => c.field === 'Category: Shopping')?.to).toBe('₹4,800');
    expect(diff.changes.find((c) => c.field === 'Category: Transportation')?.to).toBe('₹2,900');
    expect(diff.changes.find((c) => c.field === 'Category: Entertainment')?.to).toBe('₹1,900');

    // Flexible pool from 2,000 to 0
    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange?.from).toBe('₹2,000');
    expect(poolChange?.to).toBe('₹0');
  });

  it('Edge Case 7: handles adding a new category cap when budget is already active', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
        Travel: 3000,
      },
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Charlie');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(true);

    const addedCat = diff.changes.find((c) => c.field === 'Category: Travel');
    expect(addedCat).toBeDefined();
    expect(addedCat?.type).toBe('added');
    expect(addedCat?.to).toBe('₹3,000');

    // Unchanged category not present
    expect(diff.changes.some((c) => c.field === 'Category: Food and Drink')).toBe(false);

    // Flexible pool decreased from 20,000 to 17,000
    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange?.from).toBe('₹20,000');
    expect(poolChange?.to).toBe('₹17,000');
  });

  it('Edge Case 8: handles removing an individual category cap', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
        Travel: 3000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Charlie');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(true);

    const removedCat = diff.changes.find((c) => c.field === 'Category: Travel');
    expect(removedCat).toBeDefined();
    expect(removedCat?.type).toBe('removed');
    expect(removedCat?.from).toBe('₹3,000');

    // Flexible pool increased from 17,000 to 20,000
    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange?.from).toBe('₹17,000');
    expect(poolChange?.to).toBe('₹20,000');
  });

  it('Edge Case 9: handles clearing all category limits (100% flexible pool)', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {},
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Alice');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(true);

    const removedCat = diff.changes.find((c) => c.field === 'Category: Food and Drink');
    expect(removedCat?.type).toBe('removed');
    expect(removedCat?.from).toBe('₹5,000');

    const poolChange = diff.changes.find((c) => c.field === 'Flexible Pool');
    expect(poolChange?.from).toBe('₹20,000');
    expect(poolChange?.to).toBe('₹25,000');
  });

  it('Edge Case 10: handles alert threshold changes', () => {
    const oldBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      alertThresholds: [75, 90],
    };

    const newBudget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      alertThresholds: [75, 90, 100],
    };

    const diff = diffBudgetChanges(oldBudget, newBudget, 'Bob');

    expect(diff.hasChanges).toBe(true);
    expect(diff.monthlyBudgetUnchanged).toBe(true);

    const thresholdChange = diff.changes.find((c) => c.field === 'Alert Thresholds');
    expect(thresholdChange).toBeDefined();
    expect(thresholdChange?.from).toBe('75%, 90%');
    expect(thresholdChange?.to).toBe('75%, 90%, 100%');
  });

  it('Edge Case 11: handles zero changes gracefully', () => {
    const budget: GroupBudget = {
      enabled: true,
      monthlyLimit: 25000,
      categoryLimits: {
        'Food and Drink': 5000,
      },
      alertThresholds: [75, 90, 100],
    };

    const diff = diffBudgetChanges(budget, budget, 'Alice');

    expect(diff.hasChanges).toBe(false);
    expect(diff.changes.length).toBe(0);
  });
});
