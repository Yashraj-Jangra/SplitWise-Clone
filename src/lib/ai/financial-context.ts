import { getGroupById, getGroupsByUserId } from '@/lib/services/group.service';
import { getGroupBalances, getAllUserBalances, simplifyDebts } from '@/lib/services/balance.service';
import { getExpensesByGroupId } from '@/lib/services/expense.service';
import { getFullName } from '@/lib/utils';
import {
  calculateSpendingTrends,
  calculateCategoryTimeline,
  calculateMemberCuts,
  calculateBudgetForecast,
  calculateSpendingSpikes,
} from '@/lib/ai/financial-analytics';
import type {
  SpendingTrendResult,
  CategoryTimelineResult,
  MemberCutResult,
  BudgetForecastResult,
  SpendingSpike,
  QueryIntent,
} from '@/types/ai';
import type { Balance } from '@/types';

export interface FinancialSnapshot {
  scope: 'group' | 'global';
  groupName?: string;
  netBalance: number;
  youAreOwed: { name: string; amount: number }[];
  youOwe: { name: string; amount: number }[];
  monthlySpent: number;
  recentExpenses: {
    description: string;
    amount: number;
    date: string;
    paidBy: string;
  }[];
  budget?: {
    monthlyLimit: number;
    currentSpent: number;
    percentage: number;
  };
  intent?: QueryIntent;
  trendData?: SpendingTrendResult;
  categoryData?: CategoryTimelineResult;
  memberCutData?: MemberCutResult;
  budgetForecast?: BudgetForecastResult;
  spikes?: SpendingSpike[];
  formattedText: string;
}

/**
 * Intelligent Intent Classifier for Financial Inquiries
 */
export function detectQueryIntent(message: string): {
  intent: QueryIntent;
  categoryQuery?: string;
  isExplicitDraft: boolean;
  isCasualGreeting: boolean;
} {
  const lower = message.toLowerCase().trim();

  const isExplicitDraft =
    /^(draft|write|compose|suggest (a )?reply|say to|craft|pen|prepare a message|prepare an email)\b/i.test(lower) ||
    /\b(draft (an?|the|a response|an answer)|write (an?|the|a message|an email|a note))\b/i.test(message);

  const isCasualGreeting =
    /^(hi|hello|hey|greetings|hola|thanks|thank you|ok|okay|cool|bye|good (morning|afternoon|evening)|who are you|what can you do|how do you work|help me)\b/i.test(lower);

  if (isExplicitDraft) {
    return { intent: 'DRAFT', isExplicitDraft: true, isCasualGreeting: false };
  }

  // Member cut check (who paid what, member share, cut breakdown)
  if (/\b(cut|cuts|share|shares|contribution|who paid what|who paid how much|everyone('?s)? (cut|share)|member('?s)? (cut|share)|breakdown of (everyone|all members|members)|members cut)\b/i.test(lower)) {
    return { intent: 'MEMBER_CUT', isExplicitDraft: false, isCasualGreeting: false };
  }

  // Budget forecast check (evaluate before generic pacing/trend)
  if (/\b(budget|limit|exceed|run out|safe to spend|budget pacing|budget forecast|will we exceed)\b/i.test(lower)) {
    return { intent: 'BUDGET_RUNRATE', isExplicitDraft: false, isCasualGreeting: false };
  }

  // Spikes & large expense check
  if (/\b(spike|spikes|biggest (expense|purchase|spend)|largest (expense|purchase|spend)|highest (expense|purchase|spend)|outlier)\b/i.test(lower)) {
    return { intent: 'SPENDING_SPIKE', isExplicitDraft: false, isCasualGreeting: false };
  }

  // Category timeline check: Match known categories or "spent on X"
  const candidateKeywords = [
    'food', 'dining', 'restaurant', 'cafe', 'groceries', 'grocery', 'swiggy', 'zomato', 'takeout',
    'travel', 'transportation', 'taxi', 'cab', 'uber', 'ola', 'flight', 'flights', 'fuel', 'petrol',
    'rent', 'housing', 'utilities', 'electricity', 'water', 'internet', 'wifi', 'recharge', 'phone',
    'entertainment', 'movie', 'movies', 'cinema', 'games', 'gaming', 'music', 'spotify', 'sports',
    'shopping', 'clothing', 'electronics', 'health', 'medicine', 'doctor', 'gym'
  ];

  let extractedCategory: string | undefined = undefined;
  for (const kw of candidateKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
      extractedCategory = kw;
      break;
    }
  }

  const categoryRegexMatch = lower.match(/(?:spend|spent|expense|cost|timeline|history|bought|shopping|paid)\s+(?:on|for|in)?\s+([a-z0-9 &]+)/i);
  if (categoryRegexMatch && !extractedCategory) {
    const rawCandidate = categoryRegexMatch[1].trim().split(/\s+(?:over|in|during|last|this|since)\b/)[0].trim();
    if (rawCandidate && rawCandidate.length > 2 && rawCandidate.length < 30) {
      extractedCategory = rawCandidate;
    }
  }

  // If a category is targeted, category timeline takes priority over generic trend
  if (extractedCategory && (/\b(timeline|over time|last|month|months|history|trend|pattern|spend|spent|how much)\b/i.test(lower))) {
    return { intent: 'CATEGORY_TIMELINE', categoryQuery: extractedCategory, isExplicitDraft: false, isCasualGreeting: false };
  }

  // Spending trend check (general month-over-month, burn rate, velocity without category)
  if (/\b(trend|trends|trending|velocity|burn rate|this month vs last|month over month|mom|pacing|run rate|spending trend|how am i doing this month)\b/i.test(lower)) {
    return { intent: 'TREND', isExplicitDraft: false, isCasualGreeting: false };
  }

  // Balance & Ledger check
  if (/\b(balance|owe|owed|debt|dues|who owes|settle|net balance|how much do i owe|how much am i owed)\b/i.test(lower)) {
    return { intent: 'BALANCE_LEDGER', isExplicitDraft: false, isCasualGreeting: false };
  }

  if (isCasualGreeting) {
    return { intent: 'GENERAL', isExplicitDraft: false, isCasualGreeting: true };
  }

  return { intent: 'SEMANTIC_SEARCH', categoryQuery: extractedCategory, isExplicitDraft: false, isCasualGreeting: false };
}

/**
 * Builds an authoritative, server-calculated financial snapshot for a user
 * ensuring zero math hallucinations by the LLM.
 * Dynamically includes trend, timeline, cut, and forecast analytics based on query intent.
 */
export async function buildFinancialSnapshot(
  userId: string,
  groupId?: string,
  userQuery?: string
): Promise<FinancialSnapshot> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const queryAnalysis = userQuery
    ? detectQueryIntent(userQuery)
    : { intent: 'BALANCE_LEDGER' as QueryIntent, categoryQuery: undefined, isExplicitDraft: false, isCasualGreeting: false };
  const detectedIntent = queryAnalysis.intent;

  if (groupId) {
    const group = await getGroupById(groupId);
    const groupName = group?.name || 'Current Group';

    // Parallel execution of base ledger plus relevant analytical modules
    const [
      groupBalances,
      expenses,
      trendData,
      categoryData,
      memberCutData,
      budgetForecast,
      spikes,
    ] = await Promise.all([
      getGroupBalances(groupId).catch(() => [] as Balance[]),
      getExpensesByGroupId(groupId).catch(() => []),
      // Trend calculation
      (detectedIntent === 'TREND' || detectedIntent === 'GENERAL')
        ? calculateSpendingTrends(userId, groupId, 3).catch(() => undefined)
        : Promise.resolve(undefined),
      // Category timeline
      (detectedIntent === 'CATEGORY_TIMELINE' || queryAnalysis.categoryQuery)
        ? calculateCategoryTimeline(userId, queryAnalysis.categoryQuery, groupId, 3).catch(() => undefined)
        : Promise.resolve(undefined),
      // Member cut calculation
      (detectedIntent === 'MEMBER_CUT')
        ? calculateMemberCuts(groupId, userId).catch(() => undefined)
        : Promise.resolve(undefined),
      // Budget forecast
      (detectedIntent === 'BUDGET_RUNRATE' || Boolean(group?.budget?.enabled))
        ? calculateBudgetForecast(groupId).catch(() => null)
        : Promise.resolve(null),
      // Spending spikes
      (detectedIntent === 'SPENDING_SPIKE')
        ? calculateSpendingSpikes(userId, groupId, 5).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    const simplified = simplifyDebts(groupBalances);
    const userBalanceObj = groupBalances.find((b) => b.user.uid === userId);
    const netBalance = userBalanceObj?.netBalance || 0;

    const youAreOwed = simplified
      .filter((s) => s.to.uid === userId)
      .map((s) => ({
        name: getFullName(s.from.firstName, s.from.lastName) || s.from.username || 'Member',
        amount: parseFloat(s.amount.toFixed(2)),
      }));

    const youOwe = simplified
      .filter((s) => s.from.uid === userId)
      .map((s) => ({
        name: getFullName(s.to.firstName, s.to.lastName) || s.to.username || 'Member',
        amount: parseFloat(s.amount.toFixed(2)),
      }));

    // Monthly spending in this group for active user
    let monthlySpent = 0;
    expenses.forEach((e) => {
      if (!e?.date) return;
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const userParticipant = e.participants.find((p) => p.user.uid === userId);
        if (userParticipant) {
          monthlySpent += userParticipant.amountOwed;
        }
      }
    });

    const recentExpenses = expenses.slice(0, 5).map((e) => ({
      description: e.description,
      amount: e.amount,
      date: e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent',
      paidBy: e.payers.map((p) => getFullName(p.user.firstName, p.user.lastName) || p.user.username).join(', ') || 'Unknown',
    }));

    let budgetInfo: FinancialSnapshot['budget'] = undefined;
    if (group?.budget?.enabled && group.budget.monthlyLimit > 0) {
      const groupMonthSpent = expenses.reduce((sum, e) => {
        if (!e?.date) return sum;
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth ? sum + e.amount : sum;
      }, 0);
      budgetInfo = {
        monthlyLimit: group.budget.monthlyLimit,
        currentSpent: parseFloat(groupMonthSpent.toFixed(2)),
        percentage: Math.round((groupMonthSpent / group.budget.monthlyLimit) * 100),
      };
    }

    const lines: string[] = [
      `SCOPE: Group "${groupName}" (ID: ${groupId})`,
      `EXACT NET BALANCE: ${netBalance > 0.01 ? `+₹${netBalance.toFixed(2)} (you are owed in net)` : netBalance < -0.01 ? `-₹${Math.abs(netBalance).toFixed(2)} (you owe in net)` : '₹0.00 (all settled up)'}`,
    ];

    if (youAreOwed.length > 0) {
      lines.push('PEOPLE WHO OWE YOU IN THIS GROUP:');
      youAreOwed.forEach((o) => lines.push(`- ${o.name} owes you ₹${o.amount.toFixed(2)}`));
    }

    if (youOwe.length > 0) {
      lines.push('PEOPLE YOU OWE IN THIS GROUP:');
      youOwe.forEach((o) => lines.push(`- You owe ${o.name} ₹${o.amount.toFixed(2)}`));
    }

    if (youAreOwed.length === 0 && youOwe.length === 0) {
      lines.push('DEBT BREAKDOWN: All debts in this group are settled up.');
    }

    lines.push(`YOUR SPENDING IN THIS GROUP THIS MONTH: ₹${monthlySpent.toFixed(2)}`);

    // Attach Member Cut Analytics if computed
    if (memberCutData) {
      lines.push('', '---', memberCutData.formattedSummary);
    }

    // Attach Trend Analytics if computed
    if (trendData) {
      lines.push('', '---', trendData.formattedSummary);
    }

    // Attach Category Timeline Analytics if computed
    if (categoryData) {
      lines.push('', '---', categoryData.formattedSummary);
    }

    // Attach Budget Forecast if available
    if (budgetForecast) {
      lines.push('', '---', budgetForecast.formattedSummary);
    } else if (budgetInfo) {
      lines.push(`GROUP BUDGET: ₹${budgetInfo.currentSpent.toFixed(2)} spent of ₹${budgetInfo.monthlyLimit.toFixed(2)} monthly limit (${budgetInfo.percentage}%)`);
    }

    // Attach Spikes if computed
    if (spikes && spikes.length > 0) {
      lines.push('', '---', 'TOP EXPENSE SPIKES (LARGEST TRANSACTIONS RECENTLY):');
      spikes.forEach((s) => {
        lines.push(`- "${s.description}": ₹${s.amount.toFixed(2)} on ${s.date} (Paid by ${s.paidBy})`);
      });
    }

    if (recentExpenses.length > 0 && !memberCutData && !trendData) {
      lines.push('', 'RECENT GROUP EXPENSES:');
      recentExpenses.forEach((e) => lines.push(`- "${e.description}": ₹${e.amount.toFixed(2)} on ${e.date} (Paid by ${e.paidBy})`));
    }

    return {
      scope: 'group',
      groupName,
      netBalance,
      youAreOwed,
      youOwe,
      monthlySpent: parseFloat(monthlySpent.toFixed(2)),
      recentExpenses,
      budget: budgetInfo,
      intent: detectedIntent,
      trendData,
      categoryData,
      memberCutData,
      budgetForecast: budgetForecast || undefined,
      spikes,
      formattedText: lines.join('\n'),
    };
  }

  // Global user scope (across all user's groups)
  const [userBalances, userGroups, trendData, categoryData, spikes] = await Promise.all([
    getAllUserBalances(userId).catch(() => [] as Balance[]),
    getGroupsByUserId(userId).catch(() => []),
    (detectedIntent === 'TREND' || detectedIntent === 'GENERAL')
      ? calculateSpendingTrends(userId, undefined, 3).catch(() => undefined)
      : Promise.resolve(undefined),
    (detectedIntent === 'CATEGORY_TIMELINE' || queryAnalysis.categoryQuery)
      ? calculateCategoryTimeline(userId, queryAnalysis.categoryQuery, undefined, 3).catch(() => undefined)
      : Promise.resolve(undefined),
    (detectedIntent === 'SPENDING_SPIKE')
      ? calculateSpendingSpikes(userId, undefined, 5).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  const totalNetBalance = userBalances.reduce((sum, b) => sum + b.netBalance, 0);

  const youAreOwed = userBalances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({
      name: getFullName(b.user.firstName, b.user.lastName) || b.user.username || 'Member',
      amount: parseFloat(b.netBalance.toFixed(2)),
    }));

  const youOwe = userBalances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({
      name: getFullName(b.user.firstName, b.user.lastName) || b.user.username || 'Member',
      amount: parseFloat(Math.abs(b.netBalance).toFixed(2)),
    }));

  const lines: string[] = [
    'SCOPE: Global (All Groups & Friends)',
    `TOTAL NET BALANCE: ${totalNetBalance > 0.01 ? `+₹${totalNetBalance.toFixed(2)} (you are owed overall)` : totalNetBalance < -0.01 ? `-₹${Math.abs(totalNetBalance).toFixed(2)} (you owe overall)` : '₹0.00 (all settled up)'}`,
    `ACTIVE GROUPS: ${userGroups.length} groups (${userGroups.map((g) => g.name).slice(0, 5).join(', ')}${userGroups.length > 5 ? '...' : ''})`,
  ];

  if (youAreOwed.length > 0) {
    lines.push('PEOPLE WHO OWE YOU OVERALL:');
    youAreOwed.forEach((o) => lines.push(`- ${o.name} owes you ₹${o.amount.toFixed(2)}`));
  }

  if (youOwe.length > 0) {
    lines.push('PEOPLE YOU OWE OVERALL:');
    youOwe.forEach((o) => lines.push(`- You owe ${o.name} ₹${o.amount.toFixed(2)}`));
  }

  if (youAreOwed.length === 0 && youOwe.length === 0) {
    lines.push('DEBT STATUS: You have no outstanding debts or credits across any group.');
  }

  // Attach Trend Analytics if computed
  if (trendData) {
    lines.push('', '---', trendData.formattedSummary);
  }

  // Attach Category Timeline Analytics if computed
  if (categoryData) {
    lines.push('', '---', categoryData.formattedSummary);
  }

  // Attach Spikes if computed
  if (spikes && spikes.length > 0) {
    lines.push('', '---', 'TOP EXPENSE SPIKES (LARGEST TRANSACTIONS RECENTLY):');
    spikes.forEach((s) => {
      lines.push(`- "${s.description}": ₹${s.amount.toFixed(2)} on ${s.date} (Paid by ${s.paidBy})`);
    });
  }

  return {
    scope: 'global',
    netBalance: parseFloat(totalNetBalance.toFixed(2)),
    youAreOwed,
    youOwe,
    monthlySpent: trendData?.currentMonthSpent || 0,
    recentExpenses: [],
    intent: detectedIntent,
    trendData,
    categoryData,
    spikes,
    formattedText: lines.join('\n'),
  };
}
