import type { Group, Expense, GroupBudget } from '@/types';
import { CURRENCY_SYMBOL } from './constants';
import { getFullName } from './utils';

export type BudgetStatus = 'healthy' | 'caution' | 'warning' | 'overbudget' | 'no_budget';

export interface CategorySpend {
  category: string;
  amount: number;
  percentageOfSpend: number;
  percentageOfBudget: number;
  allocatedLimit?: number;
  isOverLimit: boolean;
  expenseCount: number;
}

export interface TopSpender {
  userId: string;
  name: string;
  avatarUrl?: string;
  amount: number;
  percentage: number;
}

export interface SmartSuggestion {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  description: string;
  icon: string;
  tag?: string;
}

export interface GroupBudgetStats {
  hasBudget: boolean;
  isEnabled: boolean;
  monthlyLimit: number;
  monthName: string;
  year: number;
  monthIndex: number; // 0-11
  
  // Spend stats
  totalSpentThisMonth: number;
  remainingBudget: number;
  percentageUsed: number;
  status: BudgetStatus;
  
  // Time & burn rate stats
  daysInMonth: number;
  currentDayOfMonth: number;
  daysRemaining: number;
  averageDailySpend: number;
  dailySafeLimit: number;
  projectedMonthEndSpend: number;
  projectedVariance: number; // positive = overbudget projection, negative = savings
  predictedExhaustionDay: number | null; // Day of month when budget will run out
  
  // Breakdowns
  categoryBreakdowns: CategorySpend[];
  topSpenders: TopSpender[];
  monthlyExpenses: Expense[];
  suggestions: SmartSuggestion[];
}

/**
 * Calculates budget analytics, pacing, and intelligent recommendations for a group.
 */
export function calculateGroupBudgetStats(
  group: Group | null | undefined,
  expenses: Expense[],
  targetDate: Date = new Date()
): GroupBudgetStats {
  const budget: GroupBudget | undefined = group?.budget;
  const hasBudget = !!(budget && budget.monthlyLimit > 0);
  const isEnabled = !!(hasBudget && budget.enabled !== false);
  const monthlyLimit = isEnabled ? Number(budget.monthlyLimit) : 0;

  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0-indexed
  const monthName = targetDate.toLocaleString('default', { month: 'long' });

  // Current calendar comparison
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === targetYear && now.getMonth() === targetMonth;

  // Days calculations
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const currentDayOfMonth = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = Math.max(1, daysInMonth - currentDayOfMonth + 1);

  // Filter expenses strictly for the specified month
  const monthlyExpenses = expenses.filter((e) => {
    const expDate = new Date(e.date);
    return expDate.getFullYear() === targetYear && expDate.getMonth() === targetMonth;
  });

  const totalSpentThisMonth = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remainingBudget = monthlyLimit - totalSpentThisMonth;
  const percentageUsed = monthlyLimit > 0 ? (totalSpentThisMonth / monthlyLimit) * 100 : 0;

  // Status classification
  let status: BudgetStatus = 'no_budget';
  if (isEnabled) {
    if (percentageUsed >= 100) {
      status = 'overbudget';
    } else if (percentageUsed >= (budget.alertThresholds?.[1] ?? 90)) {
      status = 'warning';
    } else if (percentageUsed >= (budget.alertThresholds?.[0] ?? 75)) {
      status = 'caution';
    } else {
      status = 'healthy';
    }
  }

  // Pacing calculations
  const elapsedDays = Math.max(1, currentDayOfMonth);
  const averageDailySpend = totalSpentThisMonth / elapsedDays;
  const dailySafeLimit = isEnabled && remainingBudget > 0 ? remainingBudget / daysRemaining : 0;
  const projectedMonthEndSpend = averageDailySpend * daysInMonth;
  const projectedVariance = isEnabled ? projectedMonthEndSpend - monthlyLimit : 0;

  let predictedExhaustionDay: number | null = null;
  if (isEnabled && averageDailySpend > 0 && totalSpentThisMonth < monthlyLimit) {
    const estimatedDaysUntilCap = remainingBudget / averageDailySpend;
    const estDay = Math.round(currentDayOfMonth + estimatedDaysUntilCap);
    if (estDay <= daysInMonth) {
      predictedExhaustionDay = estDay;
    }
  }

  // Category breakdowns
  const catMap: Record<string, { amount: number; count: number }> = {};
  monthlyExpenses.forEach((exp) => {
    const cat = exp.masterCategory || exp.category || 'Uncategorized';
    if (!catMap[cat]) {
      catMap[cat] = { amount: 0, count: 0 };
    }
    catMap[cat].amount += Number(exp.amount || 0);
    catMap[cat].count += 1;
  });

  const categoryBreakdowns: CategorySpend[] = Object.entries(catMap)
    .map(([category, { amount, count }]) => {
      const allocatedLimit = budget?.categoryLimits?.[category];
      const isOverLimit = !!(allocatedLimit && allocatedLimit > 0 && amount > allocatedLimit);
      return {
        category,
        amount,
        expenseCount: count,
        percentageOfSpend: totalSpentThisMonth > 0 ? (amount / totalSpentThisMonth) * 100 : 0,
        percentageOfBudget: monthlyLimit > 0 ? (amount / monthlyLimit) * 100 : 0,
        allocatedLimit,
        isOverLimit,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Top Spenders (based on payers)
  const spendersMap: Record<string, { user: any; amount: number }> = {};
  monthlyExpenses.forEach((exp) => {
    (exp.payers || []).forEach((payer) => {
      const uid = payer.user?.uid;
      if (uid) {
        if (!spendersMap[uid]) {
          spendersMap[uid] = { user: payer.user, amount: 0 };
        }
        spendersMap[uid].amount += Number(payer.amount || 0);
      }
    });
  });

  const topSpenders: TopSpender[] = Object.entries(spendersMap)
    .map(([uid, { user, amount }]) => ({
      userId: uid,
      name: getFullName(user.firstName, user.lastName),
      avatarUrl: user.avatarUrl,
      amount,
      percentage: totalSpentThisMonth > 0 ? (amount / totalSpentThisMonth) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Generate Smart Suggestions
  const suggestions = generateSmartSuggestions({
    isEnabled,
    monthlyLimit,
    totalSpentThisMonth,
    remainingBudget,
    percentageUsed,
    status,
    daysRemaining,
    averageDailySpend,
    dailySafeLimit,
    projectedMonthEndSpend,
    projectedVariance,
    predictedExhaustionDay,
    categoryBreakdowns,
    monthName,
    topSpenders,
  });

  return {
    hasBudget,
    isEnabled,
    monthlyLimit,
    monthName,
    year: targetYear,
    monthIndex: targetMonth,
    totalSpentThisMonth,
    remainingBudget,
    percentageUsed,
    status,
    daysInMonth,
    currentDayOfMonth,
    daysRemaining,
    averageDailySpend,
    dailySafeLimit,
    projectedMonthEndSpend,
    projectedVariance,
    predictedExhaustionDay,
    categoryBreakdowns,
    topSpenders,
    monthlyExpenses,
    suggestions,
  };
}

/**
 * Intelligent rules engine generating actionable financial advice and pace alerts.
 */
function generateSmartSuggestions(params: {
  isEnabled: boolean;
  monthlyLimit: number;
  totalSpentThisMonth: number;
  remainingBudget: number;
  percentageUsed: number;
  status: BudgetStatus;
  daysRemaining: number;
  averageDailySpend: number;
  dailySafeLimit: number;
  projectedMonthEndSpend: number;
  projectedVariance: number;
  predictedExhaustionDay: number | null;
  categoryBreakdowns: CategorySpend[];
  monthName: string;
  topSpenders: TopSpender[];
}): SmartSuggestion[] {
  const list: SmartSuggestion[] = [];

  if (!params.isEnabled) {
    list.push({
      id: 'no-budget-prompt',
      type: 'info',
      title: 'Set a Monthly Target',
      description: 'Define a monthly spending budget to track burn rates, get daily allowances, and receive automated pacing alerts.',
      icon: 'Coins',
      tag: 'Setup',
    });
    return list;
  }

  // 1. Overbudget Alert
  if (params.status === 'overbudget') {
    const overAmount = Math.abs(params.remainingBudget);
    list.push({
      id: 'overbudget-alert',
      type: 'danger',
      title: `Over Budget by ${CURRENCY_SYMBOL}${overAmount.toFixed(0)}`,
      description: `The group has exceeded the ${params.monthName} limit of ${CURRENCY_SYMBOL}${params.monthlyLimit.toLocaleString('en-IN')}. Consider postponing non-essential shared expenses or revising the limit.`,
      icon: 'TrendingDown',
      tag: 'Critical Alert',
    });
  }
  // 2. High Burn Rate / Predicted Exhaustion
  else if (params.predictedExhaustionDay && params.predictedExhaustionDay <= 31) {
    list.push({
      id: 'exhaustion-warning',
      type: 'warning',
      title: `Budget Projected to Run Out by Day ${params.predictedExhaustionDay}`,
      description: `At the current spending velocity of ${CURRENCY_SYMBOL}${params.averageDailySpend.toFixed(0)}/day, the group will exhaust its budget before the end of the month.`,
      icon: 'TrendingDown',
      tag: 'Pacing Warning',
    });
  }
  // 3. Healthy Pacing / Projected Surplus
  else if (params.status === 'healthy' && params.projectedVariance < 0) {
    const projectedSavings = Math.abs(params.projectedVariance);
    list.push({
      id: 'healthy-pacing',
      type: 'success',
      title: `On Track for ${CURRENCY_SYMBOL}${projectedSavings.toFixed(0)} Surplus`,
      description: `Excellent pace! At current velocity, the group will finish ${params.monthName} well under budget with ~${CURRENCY_SYMBOL}${projectedSavings.toFixed(0)} remaining.`,
      icon: 'TrendingUp',
      tag: 'On Track',
    });
  }

  // 4. Safe Daily Allowance Guidance
  if (params.remainingBudget > 0 && params.daysRemaining > 0) {
    list.push({
      id: 'daily-safe-limit',
      type: 'info',
      title: `Safe Daily Allowance: ${CURRENCY_SYMBOL}${params.dailySafeLimit.toFixed(0)}/day`,
      description: `To finish within budget for the remaining ${params.daysRemaining} days, keep group expenditures under ${CURRENCY_SYMBOL}${params.dailySafeLimit.toFixed(0)} daily.`,
      icon: 'ShieldCheck',
      tag: 'Daily Allowance',
    });
  }

  // 5. Category Spike Detection (>40% of budget)
  if (params.categoryBreakdowns.length > 0) {
    const dominantCat = params.categoryBreakdowns[0];
    if (dominantCat.percentageOfSpend >= 40 && dominantCat.amount > 0) {
      list.push({
        id: `dominant-cat-${dominantCat.category}`,
        type: 'warning',
        title: `${dominantCat.category} Dominates ${dominantCat.percentageOfSpend.toFixed(0)}% of Spend`,
        description: `${dominantCat.category} accounts for ${CURRENCY_SYMBOL}${dominantCat.amount.toFixed(0)} across ${dominantCat.expenseCount} expenses this month. Reviewing shared alternatives here offers the highest savings.`,
        icon: 'PieChart',
        tag: 'Category Spike',
      });
    }

    // Category Overlimit Alert
    const overLimitCat = params.categoryBreakdowns.find((c) => c.isOverLimit);
    if (overLimitCat && overLimitCat.allocatedLimit) {
      list.push({
        id: `cat-overlimit-${overLimitCat.category}`,
        type: 'danger',
        title: `${overLimitCat.category} Exceeded Allocated Limit`,
        description: `Spent ${CURRENCY_SYMBOL}${overLimitCat.amount.toFixed(0)} out of the ${CURRENCY_SYMBOL}${overLimitCat.allocatedLimit.toFixed(0)} allocated ceiling for ${overLimitCat.category}.`,
        icon: 'TrendingDown',
        tag: 'Category Limit',
      });
    }
  }

  return list;
}
