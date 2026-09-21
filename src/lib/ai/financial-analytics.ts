import { getGroupById } from '@/lib/services/group.service';
import { getExpensesByGroupId, getExpensesByUserId } from '@/lib/services/expense.service';
import { getFullName } from '@/lib/utils';
import { defaultExpenseCategories } from '@/lib/expense-categories';
import type {
  SpendingTrendResult,
  SpendingTrendMonth,
  CategoryTimelineResult,
  CategoryTimelineMonth,
  MemberCutResult,
  MemberCutDetail,
  BudgetForecastResult,
  SpendingSpike,
} from '@/types/ai';
import type { Expense } from '@/types';

/**
 * Format a Date into a month key 'YYYY-MM' and human label 'MMM YYYY'
 */
function getMonthMeta(d: Date): { key: string; label: string; year: number; month: number } {
  const year = d.getFullYear();
  const month = d.getMonth();
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  return { key, label, year, month };
}

/**
 * 1. Spending Trend Analyzer
 * Computes Month-over-Month velocity, daily burn rate, and projections.
 */
export async function calculateSpendingTrends(
  userId: string,
  groupId?: string,
  monthsBack: number = 3
): Promise<SpendingTrendResult> {
  const now = new Date();
  const currentMonthMeta = getMonthMeta(now);

  // Generate target month keys [Current, M-1, M-2, ...]
  const targetMonths: Array<{ key: string; label: string; year: number; month: number }> = [];
  for (let i = 0; i < monthsBack; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    targetMonths.push(getMonthMeta(targetDate));
  }

  const monthMap = new Map<string, SpendingTrendMonth>();
  targetMonths.forEach((m) => {
    monthMap.set(m.key, {
      monthKey: m.key,
      label: m.label,
      personalSpent: 0,
      groupTotalSpent: groupId ? 0 : undefined,
      expenseCount: 0,
    });
  });

  if (groupId) {
    const [group, expenses] = await Promise.all([
      getGroupById(groupId),
      getExpensesByGroupId(groupId).catch(() => [] as Expense[]),
    ]);
    const groupName = group?.name || 'Group';

    // Track spending per member across months for group analytics
    const memberSpendMap = new Map<string, { current: number; previous: number; name: string }>();
    if (group?.members) {
      group.members.forEach((m) => {
        const name = getFullName(m.firstName, m.lastName) || m.username || 'Member';
        memberSpendMap.set(m.uid, { current: 0, previous: 0, name });
      });
    }

    const prevMonthKey = targetMonths[1]?.key;

    expenses.forEach((e) => {
      if (!e.date) return;
      const d = new Date(e.date);
      const meta = getMonthMeta(d);
      const bucket = monthMap.get(meta.key);
      if (bucket) {
        bucket.expenseCount += 1;
        bucket.groupTotalSpent = (bucket.groupTotalSpent || 0) + e.amount;

        // User personal share
        const myPart = e.participants.find((p) => p.user.uid === userId);
        if (myPart) {
          bucket.personalSpent += myPart.amountOwed;
        }

        // Member tracking for current vs previous
        if (meta.key === currentMonthMeta.key || meta.key === prevMonthKey) {
          e.participants.forEach((p) => {
            const mem = memberSpendMap.get(p.user.uid);
            if (mem) {
              if (meta.key === currentMonthMeta.key) {
                mem.current += p.amountOwed;
              } else if (meta.key === prevMonthKey) {
                mem.previous += p.amountOwed;
              }
            }
          });
        }
      }
    });

    const months = Array.from(monthMap.values()).reverse();
    const currentBucket = monthMap.get(currentMonthMeta.key) || { personalSpent: 0, groupTotalSpent: 0, expenseCount: 0, monthKey: '', label: '' };
    const prevBucket = prevMonthKey ? monthMap.get(prevMonthKey) : null;

    const currentSpent = currentBucket.personalSpent;
    const prevSpent = prevBucket ? prevBucket.personalSpent : 0;

    const momChangePct = prevSpent > 0
      ? parseFloat((((currentSpent - prevSpent) / prevSpent) * 100).toFixed(1))
      : null;

    const daysElapsed = Math.max(1, now.getDate());
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyBurnRate = parseFloat((currentSpent / daysElapsed).toFixed(2));
    const projectedMonthEndSpent = parseFloat((dailyBurnRate * daysInMonth).toFixed(2));

    const memberTrends = Array.from(memberSpendMap.entries()).map(([uid, data]) => {
      const changePct = data.previous > 0
        ? parseFloat((((data.current - data.previous) / data.previous) * 100).toFixed(1))
        : null;
      return {
        userId: uid,
        name: data.name,
        currentMonthSpent: parseFloat(data.current.toFixed(2)),
        previousMonthSpent: parseFloat(data.previous.toFixed(2)),
        changePct,
      };
    });

    const summaryLines: string[] = [
      `SCOPE: Group "${groupName}" Spending Trend`,
      `- Current Month (${currentMonthMeta.label}): Your Share ₹${currentSpent.toFixed(2)} | Group Total: ₹${(currentBucket.groupTotalSpent || 0).toFixed(2)}`,
    ];

    if (prevBucket) {
      summaryLines.push(
        `- Previous Month (${prevBucket.label}): Your Share ₹${prevSpent.toFixed(2)} | Group Total: ₹${(prevBucket.groupTotalSpent || 0).toFixed(2)}`
      );
      if (momChangePct !== null) {
        const arrow = momChangePct > 0 ? '📈' : '📉';
        const sign = momChangePct > 0 ? '+' : '';
        summaryLines.push(`- Month-over-Month (MoM): ${arrow} ${sign}${momChangePct}% compared to last month.`);
      }
    }

    summaryLines.push(
      `- Spending Velocity: ₹${dailyBurnRate.toFixed(2)} / day (Day ${daysElapsed} of ${daysInMonth})`,
      `- Projected Month-End Total (at current velocity): ₹${projectedMonthEndSpent.toFixed(2)}`
    );

    if (memberTrends.length > 0) {
      summaryLines.push('MEMBER BREAKDOWN THIS MONTH:');
      memberTrends.forEach((m) => {
        const delta = m.changePct !== null ? ` (${m.changePct >= 0 ? '+' : ''}${m.changePct}% MoM)` : '';
        summaryLines.push(`  * ${m.name}: ₹${m.currentMonthSpent.toFixed(2)}${delta}`);
      });
    }

    return {
      scope: 'group',
      groupName,
      months,
      currentMonthSpent: parseFloat(currentSpent.toFixed(2)),
      previousMonthSpent: parseFloat(prevSpent.toFixed(2)),
      monthOverMonthChangePct: momChangePct,
      dailyBurnRate,
      projectedMonthEndSpent,
      memberTrends,
      formattedSummary: summaryLines.join('\n'),
    };
  }

  // Global user scope
  const expenses = await getExpensesByUserId(userId).catch(() => [] as Expense[]);

  expenses.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date);
    const meta = getMonthMeta(d);
    const bucket = monthMap.get(meta.key);
    if (bucket) {
      bucket.expenseCount += 1;
      const myPart = e.participants.find((p) => p.user.uid === userId);
      if (myPart) {
        bucket.personalSpent += myPart.amountOwed;
      }
    }
  });

  const months = Array.from(monthMap.values()).reverse();
  const currentBucket = monthMap.get(currentMonthMeta.key) || { personalSpent: 0, expenseCount: 0, monthKey: '', label: '' };
  const prevMonthKey = targetMonths[1]?.key;
  const prevBucket = prevMonthKey ? monthMap.get(prevMonthKey) : null;

  const currentSpent = currentBucket.personalSpent;
  const prevSpent = prevBucket ? prevBucket.personalSpent : 0;

  const momChangePct = prevSpent > 0
    ? parseFloat((((currentSpent - prevSpent) / prevSpent) * 100).toFixed(1))
    : null;

  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyBurnRate = parseFloat((currentSpent / daysElapsed).toFixed(2));
  const projectedMonthEndSpent = parseFloat((dailyBurnRate * daysInMonth).toFixed(2));

  const summaryLines: string[] = [
    `SCOPE: Overall Personal Spending Trend (Across All Groups)`,
    `- Current Month (${currentMonthMeta.label}): ₹${currentSpent.toFixed(2)} (${currentBucket.expenseCount} expenses)`,
  ];

  if (prevBucket) {
    summaryLines.push(`- Previous Month (${prevBucket.label}): ₹${prevSpent.toFixed(2)} (${prevBucket.expenseCount} expenses)`);
    if (momChangePct !== null) {
      const arrow = momChangePct > 0 ? '📈' : '📉';
      const sign = momChangePct > 0 ? '+' : '';
      summaryLines.push(`- Month-over-Month (MoM): ${arrow} ${sign}${momChangePct}% change.`);
    }
  }

  summaryLines.push(
    `- Daily Burn Rate: ₹${dailyBurnRate.toFixed(2)} / day`,
    `- Estimated Month-End Spend: ₹${projectedMonthEndSpent.toFixed(2)}`
  );

  return {
    scope: 'user',
    months,
    currentMonthSpent: parseFloat(currentSpent.toFixed(2)),
    previousMonthSpent: parseFloat(prevSpent.toFixed(2)),
    monthOverMonthChangePct: momChangePct,
    dailyBurnRate,
    projectedMonthEndSpent,
    formattedSummary: summaryLines.join('\n'),
  };
}

/**
 * Build a list of matching keywords and category names from defaultExpenseCategories
 */
export function resolveCategoryKeywords(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const matchedKeywords = new Set<string>([normalized]);

  for (const [master, masterObj] of Object.entries(defaultExpenseCategories)) {
    const masterLower = master.toLowerCase();
    const isMasterMatch = masterLower.includes(normalized) || normalized.includes(masterLower);

    if (masterObj?.subCategories) {
      for (const [sub, subObj] of Object.entries(masterObj.subCategories)) {
        const subLower = sub.toLowerCase();
        const isSubMatch = subLower.includes(normalized) || normalized.includes(subLower);
        const hasKeywordMatch = (subObj.keywords || []).some((kw) => kw.includes(normalized) || normalized.includes(kw));

        if (isMasterMatch || isSubMatch || hasKeywordMatch) {
          matchedKeywords.add(masterLower);
          matchedKeywords.add(subLower);
          (subObj.keywords || []).forEach((kw) => matchedKeywords.add(kw.toLowerCase()));
        }
      }
    }
  }

  return Array.from(matchedKeywords);
}

/**
 * 2. Category Timeline Analyzer
 * Aggregates spending for a given category (or overall top categories) over months.
 */
export async function calculateCategoryTimeline(
  userId: string,
  categoryQuery?: string,
  groupId?: string,
  monthsBack: number = 3
): Promise<CategoryTimelineResult> {
  const now = new Date();
  const targetMonths: Array<{ key: string; label: string }> = [];
  for (let i = 0; i < monthsBack; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    targetMonths.push(getMonthMeta(targetDate));
  }

  const rawExpenses = groupId
    ? await getExpensesByGroupId(groupId).catch(() => [] as Expense[])
    : await getExpensesByUserId(userId).catch(() => [] as Expense[]);

  const normalizedQuery = (categoryQuery || '').trim().toLowerCase();
  const keywords = resolveCategoryKeywords(normalizedQuery);

  // Find category match keywords
  const matchedExpenses = rawExpenses.filter((e) => {
    if (!normalizedQuery) return true;
    const cat = (e.category || '').toLowerCase();
    const master = (e.masterCategory || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();

    return keywords.some((kw) => cat.includes(kw) || master.includes(kw) || desc.includes(kw));
  });

  const monthBuckets = new Map<string, { amount: number; count: number; label: string }>();
  targetMonths.forEach((m) => {
    monthBuckets.set(m.key, { amount: 0, count: 0, label: m.label });
  });

  let totalSpent = 0;
  let personalShare = 0;

  matchedExpenses.forEach((e) => {
    if (!e.date) return;
    const meta = getMonthMeta(new Date(e.date));
    const bucket = monthBuckets.get(meta.key);
    if (bucket) {
      bucket.amount += e.amount;
      bucket.count += 1;
      totalSpent += e.amount;

      const myPart = e.participants.find((p) => p.user.uid === userId);
      if (myPart) {
        personalShare += myPart.amountOwed;
      }
    }
  });

  const months: CategoryTimelineMonth[] = Array.from(monthBuckets.entries())
    .map(([key, data]) => ({
      monthKey: key,
      label: data.label,
      amount: parseFloat(data.amount.toFixed(2)),
      expenseCount: data.count,
    }))
    .reverse();

  // Top 5 expenses in this category
  const topExpenses = [...matchedExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({
      description: e.description,
      amount: e.amount,
      date: e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent',
      paidBy: e.payers.map((p) => getFullName(p.user.firstName, p.user.lastName) || p.user.username).join(', ') || 'Unknown',
    }));

  // Determine trend direction comparing recent month to previous
  let trendDirection: CategoryTimelineResult['trendDirection'] = 'stable';
  if (months.length >= 2) {
    const latest = months[months.length - 1].amount;
    const previous = months[months.length - 2].amount;
    if (latest > previous * 1.1) trendDirection = 'increasing';
    else if (latest < previous * 0.9) trendDirection = 'decreasing';
  }

  const categoryName = categoryQuery || 'All Categories';
  const summaryLines: string[] = [
    `CATEGORY TIMELINE: "${categoryName}" (Last ${monthsBack} Months)`,
    `- Total Cumulative Spend: ₹${totalSpent.toFixed(2)} (Your Share: ₹${personalShare.toFixed(2)})`,
    `- Monthly Trajectory: ${trendDirection.toUpperCase()}`,
  ];

  months.forEach((m) => {
    summaryLines.push(`  * ${m.label}: ₹${m.amount.toFixed(2)} (${m.expenseCount} transactions)`);
  });

  if (topExpenses.length > 0) {
    summaryLines.push('TOP TRANSACTIONS IN THIS CATEGORY:');
    topExpenses.forEach((t) => {
      summaryLines.push(`  * "${t.description}": ₹${t.amount.toFixed(2)} on ${t.date} (Paid by ${t.paidBy})`);
    });
  }

  return {
    category: categoryName,
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    personalShare: parseFloat(personalShare.toFixed(2)),
    months,
    topExpenses,
    trendDirection,
    formattedSummary: summaryLines.join('\n'),
  };
}

/**
 * 3. Group Member Cut & Contribution Breakdown
 * Calculates total paid out of pocket vs total share consumed ("cut") per member.
 */
export async function calculateMemberCuts(
  groupId: string,
  userId?: string
): Promise<MemberCutResult> {
  const [group, expenses] = await Promise.all([
    getGroupById(groupId),
    getExpensesByGroupId(groupId).catch(() => [] as Expense[]),
  ]);

  if (!group) {
    throw new Error('Group not found');
  }

  const memberMap = new Map<string, MemberCutDetail>();

  // Initialize with all members in the group
  group.members.forEach((m) => {
    memberMap.set(m.uid, {
      userId: m.uid,
      name: getFullName(m.firstName, m.lastName) || m.username || 'Member',
      username: m.username,
      totalPaid: 0,
      totalConsumed: 0,
      netBalance: 0,
      percentageOfTotal: 0,
      expenseCount: 0,
    });
  });

  let totalGroupSpend = 0;

  expenses.forEach((e) => {
    totalGroupSpend += e.amount;

    // Track payers (amount paid out of pocket)
    e.payers.forEach((p) => {
      const record = memberMap.get(p.user.uid);
      if (record) {
        record.totalPaid += p.amount;
      }
    });

    // Track participants (amount owed / consumed cut)
    e.participants.forEach((p) => {
      const record = memberMap.get(p.user.uid);
      if (record) {
        record.totalConsumed += p.amountOwed;
        record.expenseCount += 1;
      }
    });
  });

  // Calculate net balances and percentage cuts
  const members = Array.from(memberMap.values()).map((m) => {
    const netBalance = parseFloat((m.totalPaid - m.totalConsumed).toFixed(2));
    const percentageOfTotal = totalGroupSpend > 0
      ? parseFloat(((m.totalConsumed / totalGroupSpend) * 100).toFixed(1))
      : 0;

    return {
      ...m,
      totalPaid: parseFloat(m.totalPaid.toFixed(2)),
      totalConsumed: parseFloat(m.totalConsumed.toFixed(2)),
      netBalance,
      percentageOfTotal,
    };
  });

  // Sort by total consumed descending to easily show who had the biggest cut
  members.sort((a, b) => b.totalConsumed - a.totalConsumed);

  const highestPayer = [...members].sort((a, b) => b.totalPaid - a.totalPaid)[0] || { name: 'None', totalPaid: 0 };
  const highestConsumer = members[0] || { name: 'None', totalConsumed: 0 };

  const summaryLines: string[] = [
    `GROUP MEMBER CUTS & CONTRIBUTION BREAKDOWN: "${group.name}"`,
    `- Total Cumulative Group Spending: ₹${totalGroupSpend.toFixed(2)}`,
    `- Member Count: ${members.length}`,
    `- Highest Contributor (Paid Out of Pocket): ${highestPayer.name} (₹${highestPayer.totalPaid.toFixed(2)})`,
    `- Highest Consumption (Cut): ${highestConsumer.name} (₹${highestConsumer.totalConsumed.toFixed(2)} - ${highestConsumer.percentageOfTotal}% of group spend)`,
    '',
    'MEMBER BREAKDOWN (Paid vs Consumed Cut vs Net):',
  ];

  members.forEach((m) => {
    const status = m.netBalance > 0.01
      ? `+₹${m.netBalance.toFixed(2)} (owed to them)`
      : m.netBalance < -0.01
      ? `-₹${Math.abs(m.netBalance).toFixed(2)} (owes group)`
      : '₹0.00 (settled)';

    const isCurrent = userId && m.userId === userId ? ' [YOU]' : '';
    summaryLines.push(
      `* ${m.name}${isCurrent}: Paid ₹${m.totalPaid.toFixed(2)} | Cut (Consumed): ₹${m.totalConsumed.toFixed(2)} (${m.percentageOfTotal}% of total) | Net: ${status}`
    );
  });

  return {
    groupId,
    groupName: group.name,
    totalGroupSpend: parseFloat(totalGroupSpend.toFixed(2)),
    memberCount: members.length,
    members,
    highestPayer: { name: highestPayer.name, amount: highestPayer.totalPaid },
    highestConsumer: { name: highestConsumer.name, amount: highestConsumer.totalConsumed },
    formattedSummary: summaryLines.join('\n'),
  };
}

/**
 * 4. Group Budget Run-Rate & Exhaustion Forecaster
 */
export async function calculateBudgetForecast(groupId: string): Promise<BudgetForecastResult | null> {
  const [group, expenses] = await Promise.all([
    getGroupById(groupId),
    getExpensesByGroupId(groupId).catch(() => [] as Expense[]),
  ]);

  if (!group || !group.budget?.enabled || !group.budget.monthlyLimit) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysElapsed = Math.max(1, now.getDate());
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  let currentSpent = 0;
  expenses.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      currentSpent += e.amount;
    }
  });

  const limit = group.budget.monthlyLimit;
  const percentageUsed = parseFloat(((currentSpent / limit) * 100).toFixed(1));
  const currentDailySpend = parseFloat((currentSpent / daysElapsed).toFixed(2));
  const projectedMonthEndSpend = parseFloat((currentDailySpend * daysInMonth).toFixed(2));
  const willExceedBudget = projectedMonthEndSpend > limit;

  const remainingBudget = Math.max(0, limit - currentSpent);
  const recommendedDailyBudgetRemaining = daysRemaining > 0
    ? parseFloat((remainingBudget / daysRemaining).toFixed(2))
    : 0;

  const summaryLines: string[] = [
    `GROUP BUDGET FORECAST: "${group.name}"`,
    `- Monthly Budget Limit: ₹${limit.toFixed(2)}`,
    `- Spent So Far: ₹${currentSpent.toFixed(2)} (${percentageUsed}% used)`,
    `- Days Elapsed: ${daysElapsed} of ${daysInMonth} (${daysRemaining} days remaining)`,
    `- Current Daily Burn Rate: ₹${currentDailySpend.toFixed(2)} / day`,
    `- Projected Month-End Total: ₹${projectedMonthEndSpend.toFixed(2)} (${willExceedBudget ? '⚠️ EXCEEDS BUDGET' : '✅ ON TRACK'})`,
    `- Safe Daily Spending Cap for Remaining Days: ₹${recommendedDailyBudgetRemaining.toFixed(2)} / day`,
  ];

  return {
    groupId,
    groupName: group.name,
    monthlyLimit: limit,
    currentSpent: parseFloat(currentSpent.toFixed(2)),
    percentageUsed,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    currentDailySpend,
    projectedMonthEndSpend,
    willExceedBudget,
    recommendedDailyBudgetRemaining,
    formattedSummary: summaryLines.join('\n'),
  };
}

/**
 * 5. Spending Spike & Anomaly Detector
 * Finds the largest transactions in the past 60 days.
 */
export async function calculateSpendingSpikes(
  userId: string,
  groupId?: string,
  limit: number = 5
): Promise<SpendingSpike[]> {
  const rawExpenses = groupId
    ? await getExpensesByGroupId(groupId).catch(() => [] as Expense[])
    : await getExpensesByUserId(userId).catch(() => [] as Expense[]);

  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

  const recent = rawExpenses.filter((e) => {
    if (!e.date) return false;
    return new Date(e.date).getTime() >= sixtyDaysAgo;
  });

  return recent
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      date: e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent',
      category: e.category,
      paidBy: e.payers.map((p) => getFullName(p.user.firstName, p.user.lastName) || p.user.username).join(', ') || 'Unknown',
    }));
}
