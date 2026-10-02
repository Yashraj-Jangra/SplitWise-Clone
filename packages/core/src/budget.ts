import { CURRENCY_SYMBOL } from './constants';
import { getFullName } from './names';
import type { GroupBudgetLike } from './diffs';

export interface CategoryDiff {
  oldLimit: number;
  newLimit: number;
  cutAmount: number;
  percentageCut: number;
}

export interface BudgetBreakdown {
  monthlyLimit: number;
  enabled: boolean;
  categoryLimits: Record<string, number>;
  totalCapped: number;
  flexiblePool: number;
  categoryCount: number;
  isOverAllocated: boolean;
  shortfall: number;
  categoriesList: Array<{ key: string; limit: number; pctOfMonthly: number }>;
}

export function computeBudgetBreakdown(budget: GroupBudgetLike | undefined): BudgetBreakdown {
  const monthlyLimit = Number(budget?.monthlyLimit) || 0;
  const enabled = Boolean(budget?.enabled);
  const categoryLimits: Record<string, number> = {};
  let totalCapped = 0;

  if (budget?.categoryLimits) {
    Object.entries(budget.categoryLimits).forEach(([key, val]) => {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        categoryLimits[key] = num;
        totalCapped += num;
      }
    });
  }

  const flexiblePool = Math.max(0, monthlyLimit - totalCapped);
  const isOverAllocated = monthlyLimit > 0 && totalCapped > monthlyLimit;
  const shortfall = Math.max(0, totalCapped - monthlyLimit);

  const categoriesList = Object.entries(categoryLimits)
    .map(([key, limit]) => ({
      key,
      limit,
      pctOfMonthly: monthlyLimit > 0 ? parseFloat(((limit / monthlyLimit) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.limit - a.limit);

  return {
    monthlyLimit,
    enabled,
    categoryLimits,
    totalCapped,
    flexiblePool,
    categoryCount: categoriesList.length,
    isOverAllocated,
    shortfall,
    categoriesList,
  };
}

export interface SmartCategoryReductionResult {
  suggestedLimits: Record<string, number>;
  categoryDiffs: Record<string, CategoryDiff>;
  totalCut: number;
  shortfall: number;
  newTotalCapped: number;
  newFlexiblePool: number;
  success: boolean;
}

/**
 * When a requested monthly budget is lower than active category caps,
 * proportionally distributes the shortfall across active categories,
 * rounding to clean ₹100 steps and reconciling on the largest category.
 */
export function calculateSmartCategoryReduction(
  categoryLimits: Record<string, number> | undefined,
  targetMonthlyLimit: number
): SmartCategoryReductionResult {
  const activeEntries = Object.entries(categoryLimits || {})
    .filter(([_, val]) => Number(val) > 0)
    .map(([key, val]) => ({ key, limit: Number(val) }))
    .sort((a, b) => b.limit - a.limit);

  const totalCapped = activeEntries.reduce((sum, e) => sum + e.limit, 0);

  if (totalCapped === 0 || targetMonthlyLimit >= totalCapped) {
    const currentLimits: Record<string, number> = {};
    const diffs: Record<string, CategoryDiff> = {};
    activeEntries.forEach((e) => {
      currentLimits[e.key] = e.limit;
      diffs[e.key] = {
        oldLimit: e.limit,
        newLimit: e.limit,
        cutAmount: 0,
        percentageCut: 0,
      };
    });
    return {
      suggestedLimits: currentLimits,
      categoryDiffs: diffs,
      totalCut: 0,
      shortfall: 0,
      newTotalCapped: totalCapped,
      newFlexiblePool: Math.max(0, targetMonthlyLimit - totalCapped),
      success: true,
    };
  }

  const shortfall = totalCapped - targetMonthlyLimit;
  const cuts: Record<string, number> = {};

  activeEntries.forEach((e) => {
    const weight = e.limit / totalCapped;
    const rawCut = weight * shortfall;
    let cut = Math.round(rawCut / 100) * 100;
    const maxAllowedCut = Math.max(0, e.limit - 100);
    cut = Math.min(cut, maxAllowedCut);
    cuts[e.key] = cut;
  });

  const totalCutCalculated = Object.values(cuts).reduce((sum, c) => sum + c, 0);
  let diff = shortfall - totalCutCalculated;

  if (diff !== 0) {
    for (const e of activeEntries) {
      const currentCut = cuts[e.key] || 0;
      const maxAllowedCut = Math.max(0, e.limit - 100);
      const newCut = currentCut + diff;
      if (newCut >= 0 && newCut <= maxAllowedCut) {
        cuts[e.key] = newCut;
        diff = 0;
        break;
      }
    }
  }

  if (diff > 0) {
    for (const e of activeEntries) {
      if (diff <= 0) break;
      const currentCut = cuts[e.key] || 0;
      const maxAllowedCut = Math.max(0, e.limit - 100);
      const available = maxAllowedCut - currentCut;
      if (available > 0) {
        const take = Math.min(diff, available);
        cuts[e.key] = currentCut + take;
        diff -= take;
      }
    }
  }

  const suggestedLimits: Record<string, number> = {};
  const categoryDiffs: Record<string, CategoryDiff> = {};
  let finalCappedSum = 0;

  activeEntries.forEach((e) => {
    const cut = cuts[e.key] || 0;
    const newLimit = Math.max(0, e.limit - cut);
    suggestedLimits[e.key] = newLimit;
    categoryDiffs[e.key] = {
      oldLimit: e.limit,
      newLimit,
      cutAmount: cut,
      percentageCut: e.limit > 0 ? parseFloat(((cut / e.limit) * 100).toFixed(1)) : 0,
    };
    finalCappedSum += newLimit;
  });

  return {
    suggestedLimits,
    categoryDiffs,
    totalCut: totalCapped - finalCappedSum,
    shortfall,
    newTotalCapped: finalCappedSum,
    newFlexiblePool: Math.max(0, targetMonthlyLimit - finalCappedSum),
    success: finalCappedSum <= targetMonthlyLimit,
  };
}

export function validateBudgetDelta(
  currentBudget: GroupBudgetLike | undefined,
  proposedMonthlyLimit: number,
  categoryUpdates?: Record<string, number>
): {
  valid: boolean;
  shortfall: number;
  flexiblePool: number;
  categorySum: number;
  reason?: string;
} {
  const breakdown = computeBudgetBreakdown(currentBudget);
  const activeLimits: Record<string, number> = {
    ...breakdown.categoryLimits,
    ...(categoryUpdates || {}),
  };

  const finalCategorySum = Object.values(activeLimits).reduce((a, b) => a + Number(b), 0);

  if (proposedMonthlyLimit < 100) {
    return {
      valid: false,
      shortfall: 100 - proposedMonthlyLimit,
      flexiblePool: 0,
      categorySum: finalCategorySum,
      reason: 'Minimum monthly budget is ₹100.',
    };
  }

  if (finalCategorySum > proposedMonthlyLimit) {
    const shortfall = finalCategorySum - proposedMonthlyLimit;
    return {
      valid: false,
      shortfall,
      flexiblePool: 0,
      categorySum: finalCategorySum,
      reason: `Total category caps (₹${finalCategorySum.toLocaleString('en-IN')}) exceed the proposed monthly limit (₹${proposedMonthlyLimit.toLocaleString('en-IN')}) by ₹${shortfall.toLocaleString('en-IN')}.`,
    };
  }

  return {
    valid: true,
    shortfall: 0,
    flexiblePool: proposedMonthlyLimit - finalCategorySum,
    categorySum: finalCategorySum,
  };
}
