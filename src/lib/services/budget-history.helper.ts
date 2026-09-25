import type { GroupBudget } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';

export interface BudgetChangeItem {
  field: string;
  from: string;
  to?: string;
  type: 'changed' | 'added' | 'removed' | 'info';
}

export interface BudgetDiffResult {
  hasChanges: boolean;
  changes: BudgetChangeItem[];
  monthlyBudgetUnchanged: boolean;
  currentMonthlyLimit: number;
  statusChanged: boolean;
  newStatus: 'enabled' | 'disabled';
  description: string;
}

/**
 * Computes an exact, granular diff between an existing budget state and a new budget state.
 * Strictly adheres to the rule: log ONLY what actually changed.
 * If the total monthly budget remains unchanged while categories or settings change,
 * monthlyBudgetUnchanged is set to true so the UI can render the prominent green callout.
 */
export function diffBudgetChanges(
  oldBudget: GroupBudget | null | undefined,
  newBudget: GroupBudget,
  actorName: string = 'A member',
  aiInitiated: boolean = false,
  aiSummary?: string
): BudgetDiffResult {
  const changes: BudgetChangeItem[] = [];

  const oldEnabled = Boolean(oldBudget && oldBudget.enabled);
  const newEnabled = Boolean(newBudget.enabled);
  const statusChanged = oldEnabled !== newEnabled;

  const oldMonthlyLimit = oldBudget?.monthlyLimit ?? 0;
  const newMonthlyLimit = newBudget.monthlyLimit ?? 0;
  const monthlyLimitChanged = oldMonthlyLimit !== newMonthlyLimit;

  const oldCategoryLimits = oldBudget?.categoryLimits || {};
  const newCategoryLimits = newBudget.categoryLimits || {};

  // 1. Status change (Enabled <-> Disabled)
  if (statusChanged) {
    changes.push({
      field: 'Budget Tracking',
      from: oldEnabled ? 'Enabled' : 'Disabled',
      to: newEnabled ? 'Enabled' : 'Disabled',
      type: 'changed',
    });
  }

  // 2. Monthly Limit change
  if (monthlyLimitChanged) {
    if (oldMonthlyLimit === 0 && newMonthlyLimit > 0) {
      changes.push({
        field: 'Monthly Budget',
        from: 'Not Set',
        to: `${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}`,
        type: 'added',
      });
    } else if (newMonthlyLimit === 0 && oldMonthlyLimit > 0) {
      changes.push({
        field: 'Monthly Budget',
        from: `${CURRENCY_SYMBOL}${oldMonthlyLimit.toLocaleString('en-IN')}`,
        to: 'Disabled',
        type: 'removed',
      });
    } else {
      changes.push({
        field: 'Monthly Budget',
        from: `${CURRENCY_SYMBOL}${oldMonthlyLimit.toLocaleString('en-IN')}`,
        to: `${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}`,
        type: 'changed',
      });
    }
  }

  // 3. Category changes (ONLY what actually changed)
  const allCategoryKeys = Array.from(
    new Set([...Object.keys(oldCategoryLimits), ...Object.keys(newCategoryLimits)])
  ).sort();

  let categoryChangesCount = 0;

  for (const cat of allCategoryKeys) {
    const oldVal = Number(oldCategoryLimits[cat]) || 0;
    const newVal = Number(newCategoryLimits[cat]) || 0;

    if (oldVal === newVal) {
      // Omit unchanged categories!
      continue;
    }

    categoryChangesCount++;

    if (oldVal === 0 && newVal > 0) {
      changes.push({
        field: `Category: ${cat}`,
        from: 'None',
        to: `${CURRENCY_SYMBOL}${newVal.toLocaleString('en-IN')}`,
        type: 'added',
      });
    } else if (oldVal > 0 && newVal === 0) {
      changes.push({
        field: `Category: ${cat}`,
        from: `${CURRENCY_SYMBOL}${oldVal.toLocaleString('en-IN')}`,
        to: 'Removed',
        type: 'removed',
      });
    } else {
      changes.push({
        field: `Category: ${cat}`,
        from: `${CURRENCY_SYMBOL}${oldVal.toLocaleString('en-IN')}`,
        to: `${CURRENCY_SYMBOL}${newVal.toLocaleString('en-IN')}`,
        type: 'changed',
      });
    }
  }

  // 4. Flexible Pool changes
  const oldCappedSum = Object.values(oldCategoryLimits).reduce((a, b) => a + Number(b || 0), 0);
  const newCappedSum = Object.values(newCategoryLimits).reduce((a, b) => a + Number(b || 0), 0);

  const oldFlexiblePool = Math.max(0, oldMonthlyLimit - oldCappedSum);
  const newFlexiblePool = Math.max(0, newMonthlyLimit - newCappedSum);

  if (
    newEnabled &&
    newMonthlyLimit > 0 &&
    (oldFlexiblePool !== newFlexiblePool || (oldMonthlyLimit === 0 && newMonthlyLimit > 0))
  ) {
    if (oldMonthlyLimit === 0) {
      changes.push({
        field: 'Flexible Pool',
        from: 'None',
        to: `${CURRENCY_SYMBOL}${newFlexiblePool.toLocaleString('en-IN')}`,
        type: 'added',
      });
    } else {
      changes.push({
        field: 'Flexible Pool',
        from: `${CURRENCY_SYMBOL}${oldFlexiblePool.toLocaleString('en-IN')}`,
        to: `${CURRENCY_SYMBOL}${newFlexiblePool.toLocaleString('en-IN')}`,
        type: 'changed',
      });
    }
  }

  // 5. Alert Threshold changes
  const oldThresholds = (oldBudget?.alertThresholds || []).slice().sort((a, b) => a - b).join(', ');
  const newThresholds = (newBudget.alertThresholds || []).slice().sort((a, b) => a - b).join(', ');

  let thresholdsChanged = false;
  if (oldThresholds !== newThresholds) {
    thresholdsChanged = true;
    const fromStr = oldThresholds ? oldThresholds.split(', ').map((t) => `${t}%`).join(', ') : 'None';
    const toStr = newThresholds ? newThresholds.split(', ').map((t) => `${t}%`).join(', ') : 'None';
    changes.push({
      field: 'Alert Thresholds',
      from: fromStr,
      to: toStr,
      type: 'changed',
    });
  }

  // 6. Monthly budget unchanged flag
  // True if total monthly budget limit did NOT change, but categories, thresholds, or status changed
  const monthlyBudgetUnchanged =
    !monthlyLimitChanged &&
    newMonthlyLimit > 0 &&
    (categoryChangesCount > 0 || thresholdsChanged || (statusChanged && newEnabled));

  // 7. Human-readable description
  let description = '';
  if (aiInitiated) {
    if (aiSummary) {
      description = `🤖 ${actorName} approved an AI budget change: ${aiSummary}`;
    } else if (monthlyBudgetUnchanged && categoryChangesCount > 0) {
      description = `🤖 ${actorName} approved an AI category allocation adjustment (${categoryChangesCount} categories modified; total monthly budget unchanged at ${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}).`;
    } else if (monthlyLimitChanged) {
      description = `🤖 ${actorName} approved an AI budget change: adjusted monthly budget from ${CURRENCY_SYMBOL}${oldMonthlyLimit.toLocaleString('en-IN')} to ${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}.`;
    } else {
      description = `🤖 ${actorName} approved an AI budget update.`;
    }
  } else {
    // Manual
    if (!oldBudget || (oldMonthlyLimit === 0 && newMonthlyLimit > 0)) {
      description = `${actorName} set up the group budget (${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}/month).`;
    } else if (!newEnabled) {
      description = `${actorName} disabled the group budget.`;
    } else if (monthlyBudgetUnchanged && categoryChangesCount > 0) {
      description = `${actorName} updated category allocations (monthly budget unchanged at ${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}).`;
    } else if (monthlyLimitChanged && categoryChangesCount > 0) {
      description = `${actorName} updated monthly budget to ${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')} and adjusted categories.`;
    } else if (monthlyLimitChanged) {
      description = `${actorName} updated monthly budget from ${CURRENCY_SYMBOL}${oldMonthlyLimit.toLocaleString('en-IN')} to ${CURRENCY_SYMBOL}${newMonthlyLimit.toLocaleString('en-IN')}.`;
    } else if (thresholdsChanged) {
      description = `${actorName} updated budget alert thresholds.`;
    } else {
      description = `${actorName} updated the group budget.`;
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    monthlyBudgetUnchanged,
    currentMonthlyLimit: newMonthlyLimit,
    statusChanged,
    newStatus: newEnabled ? 'enabled' : 'disabled',
    description,
  };
}
