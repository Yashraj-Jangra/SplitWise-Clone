import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectQueryIntent,
  buildFinancialSnapshot,
} from '@/lib/ai/financial-context';
import {
  resolveCategoryKeywords,
  calculateMemberCuts,
  calculateSpendingTrends,
  calculateCategoryTimeline,
  calculateBudgetForecast,
  calculateSpendingSpikes,
  computeBudgetBreakdown,
  calculateSmartCategoryReduction,
  validateBudgetDelta,
} from '@/lib/ai/financial-analytics';
import type { Group, Expense, UserProfile, GroupBudget } from '@/types';


// Mock the services
vi.mock('@/lib/services/group.service', () => ({
  getGroupById: vi.fn(),
  getGroupsByUserId: vi.fn(),
}));

vi.mock('@/lib/services/expense.service', () => ({
  getExpensesByGroupId: vi.fn(),
  getExpensesByUserId: vi.fn(),
}));

vi.mock('@/lib/services/balance.service', () => ({
  getAllUserBalances: vi.fn().mockResolvedValue([]),
}));

import { getGroupById, getGroupsByUserId } from '@/lib/services/group.service';
import { getExpensesByGroupId, getExpensesByUserId } from '@/lib/services/expense.service';
import { getAllUserBalances } from '@/lib/services/balance.service';

function makeUser(uid: string, name: string): UserProfile {
  return {
    uid,
    firstName: name,
    username: name.toLowerCase(),
    email: `${name.toLowerCase()}@example.com`,
    role: 'user',
  };
}

describe('Financial Analytics & AI Intent Routing', () => {
  const u1 = makeUser('u1', 'Alice');
  const u2 = makeUser('u2', 'Bob');
  const u3 = makeUser('u3', 'Charlie');

  const mockGroup: Group = {
    id: 'grp_123',
    name: 'Goa Vacation',
    createdBy: u1,
    members: [u1, u2, u3],
    totalExpenses: 4500,
    budget: {
      enabled: true,
      monthlyLimit: 10000,
      alertThresholds: [75, 90, 100],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Intent Classifier (detectQueryIntent)', () => {
    it('correctly classifies spending trend queries', () => {
      expect(detectQueryIntent("what's my trend this month?").intent).toBe('TREND');
      expect(detectQueryIntent("show me our group spending trend").intent).toBe('TREND');
      expect(detectQueryIntent("how is my month over month spending?").intent).toBe('TREND');
      expect(detectQueryIntent("what is my current burn rate?").intent).toBe('TREND');
    });

    it('correctly classifies group member cut and contribution queries', () => {
      expect(detectQueryIntent("what is each group members cut in Goa trip?").intent).toBe('MEMBER_CUT');
      expect(detectQueryIntent("breakdown of everyone's cut and share").intent).toBe('MEMBER_CUT');
      expect(detectQueryIntent("who paid what in this group?").intent).toBe('MEMBER_CUT');
      expect(detectQueryIntent("who paid how much and what is their cut?").intent).toBe('MEMBER_CUT');
    });

    it('correctly classifies category timeline queries and extracts category keyword', () => {
      const foodRes = detectQueryIntent("how much did I spend on dining out over the last 3 months?");
      expect(foodRes.intent).toBe('CATEGORY_TIMELINE');
      expect(foodRes.categoryQuery).toBe('dining');

      const travelRes = detectQueryIntent("show my timeline of flight and travel expenses");
      expect(travelRes.intent).toBe('CATEGORY_TIMELINE');
      expect(travelRes.categoryQuery).toBe('travel');

      const groceryRes = detectQueryIntent("what is my spending trend on groceries?");
      expect(groceryRes.intent).toBe('CATEGORY_TIMELINE');
      expect(groceryRes.categoryQuery).toBe('groceries');
    });

    it('correctly classifies budget run-rate queries', () => {
      expect(detectQueryIntent("will we exceed our budget this month?").intent).toBe('BUDGET_RUNRATE');
      expect(detectQueryIntent("what is our safe budget pacing?").intent).toBe('BUDGET_RUNRATE');
    });

    it('correctly classifies budget action queries (modify, increase, decrease, enable, disable, category)', () => {
      expect(detectQueryIntent("increase our monthly budget by ₹5,000").intent).toBe('BUDGET_ACTION');
      expect(detectQueryIntent("reduce the group budget by 2000").intent).toBe('BUDGET_ACTION');
      expect(detectQueryIntent("set monthly budget to 30000").intent).toBe('BUDGET_ACTION');
      expect(detectQueryIntent("enable group budget").intent).toBe('BUDGET_ACTION');
      expect(detectQueryIntent("disable group budget").intent).toBe('BUDGET_ACTION');
      expect(detectQueryIntent("set food budget to 8000").intent).toBe('BUDGET_ACTION');
    });

    it('correctly classifies spending spike queries', () => {
      expect(detectQueryIntent("what were my biggest spending spikes?").intent).toBe('SPENDING_SPIKE');
      expect(detectQueryIntent("show me my largest expense recently").intent).toBe('SPENDING_SPIKE');
    });

    it('correctly identifies pure drafting vs balance ledger', () => {
      expect(detectQueryIntent("draft a message to Alice asking for rent").intent).toBe('DRAFT');
      expect(detectQueryIntent("who owes me money right now?").intent).toBe('BALANCE_LEDGER');
      expect(detectQueryIntent("hi, how are you?").intent).toBe('GENERAL');
    });
  });

  describe('2. Category Keyword Expansion (resolveCategoryKeywords)', () => {
    it('expands keywords from defaultExpenseCategories', () => {
      const diningKeywords = resolveCategoryKeywords('dining');
      expect(diningKeywords).toContain('dining');
      expect(diningKeywords).toContain('dining out');
      expect(diningKeywords).toContain('restaurant');
      expect(diningKeywords).toContain('food and drink');

      const groceryKeywords = resolveCategoryKeywords('swiggy');
      expect(groceryKeywords).toContain('takeout');
      expect(groceryKeywords).toContain('swiggy');
    });
  });

  describe('3. Member Cut & Contribution Calculations (calculateMemberCuts)', () => {
    it('accurately computes paid out-of-pocket, consumed cut, and net standing', async () => {
      const mockExpenses: Expense[] = [
        // Alice pays 3000, split equally between Alice, Bob, Charlie (1000 each)
        {
          id: 'exp1',
          groupId: 'grp_123',
          description: 'Villa Stay',
          amount: 3000,
          splitType: 'equally',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          payers: [{ amount: 3000, user: u1 }],
          participants: [
            { amountOwed: 1000, user: u1 },
            { amountOwed: 1000, user: u2 },
            { amountOwed: 1000, user: u3 },
          ],
          expenseCreator: u1,
        },
        // Bob pays 1500, split between Bob and Charlie (750 each)
        {
          id: 'exp2',
          groupId: 'grp_123',
          description: 'Boat Cruise',
          amount: 1500,
          splitType: 'equally',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          payers: [{ amount: 1500, user: u2 }],
          participants: [
            { amountOwed: 750, user: u2 },
            { amountOwed: 750, user: u3 },
          ],
          expenseCreator: u2,
        },
      ];

      vi.mocked(getGroupById).mockResolvedValue(mockGroup);
      vi.mocked(getExpensesByGroupId).mockResolvedValue(mockExpenses);

      const result = await calculateMemberCuts('grp_123', 'u1');

      expect(result.totalGroupSpend).toBe(4500);
      expect(result.memberCount).toBe(3);
      expect(result.highestPayer.name).toBe('Alice');
      expect(result.highestPayer.amount).toBe(3000);

      const alice = result.members.find((m) => m.userId === 'u1');
      const bob = result.members.find((m) => m.userId === 'u2');
      const charlie = result.members.find((m) => m.userId === 'u3');

      // Alice: paid 3000, consumed 1000, net +2000
      expect(alice?.totalPaid).toBe(3000);
      expect(alice?.totalConsumed).toBe(1000);
      expect(alice?.netBalance).toBe(2000);
      expect(alice?.percentageOfTotal).toBe(22.2);

      // Bob: paid 1500, consumed 1750, net -250
      expect(bob?.totalPaid).toBe(1500);
      expect(bob?.totalConsumed).toBe(1750);
      expect(bob?.netBalance).toBe(-250);
      expect(bob?.percentageOfTotal).toBe(38.9);

      // Charlie: paid 0, consumed 1750, net -1750
      expect(charlie?.totalPaid).toBe(0);
      expect(charlie?.totalConsumed).toBe(1750);
      expect(charlie?.netBalance).toBe(-1750);
      expect(charlie?.percentageOfTotal).toBe(38.9);

      // Sum of net balances in a closed group must equal 0
      const netSum = (alice?.netBalance || 0) + (bob?.netBalance || 0) + (charlie?.netBalance || 0);
      expect(netSum).toBeCloseTo(0, 2);

      // Formatted summary contains readable breakdown
      expect(result.formattedSummary).toContain('GROUP MEMBER CUTS & CONTRIBUTION BREAKDOWN');
      expect(result.formattedSummary).toContain('Alice [YOU]');
    });
  });

  describe('4. Spending Trend Analyzer (calculateSpendingTrends)', () => {
    it('computes month-over-month change and burn rate accurately', async () => {
      const now = new Date();
      const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

      const mockExpenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'grp_123',
          description: 'This Month Groceries',
          amount: 2000,
          splitType: 'equally',
          date: thisMonthDate,
          createdAt: thisMonthDate,
          payers: [{ amount: 2000, user: u1 }],
          participants: [{ amountOwed: 2000, user: u1 }],
          expenseCreator: u1,
        },
        {
          id: 'exp2',
          groupId: 'grp_123',
          description: 'Last Month Rent',
          amount: 1000,
          splitType: 'equally',
          date: lastMonthDate,
          createdAt: lastMonthDate,
          payers: [{ amount: 1000, user: u1 }],
          participants: [{ amountOwed: 1000, user: u1 }],
          expenseCreator: u1,
        },
      ];

      vi.mocked(getExpensesByUserId).mockResolvedValue(mockExpenses);

      const result = await calculateSpendingTrends('u1', undefined, 3);

      expect(result.scope).toBe('user');
      expect(result.currentMonthSpent).toBe(2000);
      expect(result.previousMonthSpent).toBe(1000);
      expect(result.monthOverMonthChangePct).toBe(100); // 100% increase from 1000 to 2000
      expect(result.dailyBurnRate).toBeGreaterThan(0);
      expect(result.projectedMonthEndSpent).toBeGreaterThan(result.currentMonthSpent);
      expect(result.formattedSummary).toContain('MoM');
    });
  });

  describe('5. Category Timeline Analyzer (calculateCategoryTimeline)', () => {
    it('aggregates category expenses across months and determines trajectory', async () => {
      const now = new Date();
      const m1 = new Date(now.getFullYear(), now.getMonth(), 2).toISOString();
      const m2 = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

      const mockExpenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'grp_123',
          description: 'Dinner at Olive',
          amount: 1200,
          category: 'Dining Out',
          masterCategory: 'Food and Drink',
          splitType: 'equally',
          date: m1,
          createdAt: m1,
          payers: [{ amount: 1200, user: u1 }],
          participants: [{ amountOwed: 1200, user: u1 }],
          expenseCreator: u1,
        },
        {
          id: 'exp2',
          groupId: 'grp_123',
          description: 'Sushi Night',
          amount: 800,
          category: 'Dining Out',
          masterCategory: 'Food and Drink',
          splitType: 'equally',
          date: m2,
          createdAt: m2,
          payers: [{ amount: 800, user: u1 }],
          participants: [{ amountOwed: 800, user: u1 }],
          expenseCreator: u1,
        },
      ];

      vi.mocked(getExpensesByUserId).mockResolvedValue(mockExpenses);

      const result = await calculateCategoryTimeline('u1', 'dining', undefined, 3);

      expect(result.category).toBe('dining');
      expect(result.totalSpent).toBe(2000);
      expect(result.topExpenses.length).toBe(2);
      expect(result.topExpenses[0].description).toBe('Dinner at Olive');
      expect(result.formattedSummary).toContain('CATEGORY TIMELINE');
    });
  });

  describe('6. Budget Forecast & Spikes', () => {
    it('forecasts budget run rate and detects over-budget risk', async () => {
      const now = new Date();
      const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();

      const mockExpenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'grp_123',
          description: 'Expensive Group Dinner',
          amount: 8000,
          splitType: 'equally',
          date: thisMonthDate,
          createdAt: thisMonthDate,
          payers: [{ amount: 8000, user: u1 }],
          participants: [{ amountOwed: 8000, user: u1 }],
          expenseCreator: u1,
        },
      ];

      vi.mocked(getGroupById).mockResolvedValue(mockGroup);
      vi.mocked(getExpensesByGroupId).mockResolvedValue(mockExpenses);

      const forecast = await calculateBudgetForecast('grp_123');

      expect(forecast).not.toBeNull();
      expect(forecast?.currentSpent).toBe(8000);
      expect(forecast?.monthlyLimit).toBe(10000);
      expect(forecast?.percentageUsed).toBe(80);
      expect(forecast?.formattedSummary).toContain('GROUP BUDGET FORECAST');
    });

    it('extracts top expense spikes within last 60 days', async () => {
      const now = new Date().toISOString();
      const mockExpenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'grp_123',
          description: 'Flight Tickets',
          amount: 15000,
          splitType: 'equally',
          date: now,
          createdAt: now,
          payers: [{ amount: 15000, user: u1 }],
          participants: [{ amountOwed: 15000, user: u1 }],
          expenseCreator: u1,
        },
        {
          id: 'exp2',
          groupId: 'grp_123',
          description: 'Coffee',
          amount: 250,
          splitType: 'equally',
          date: now,
          createdAt: now,
          payers: [{ amount: 250, user: u1 }],
          participants: [{ amountOwed: 250, user: u1 }],
          expenseCreator: u1,
        },
      ];

      vi.mocked(getExpensesByUserId).mockResolvedValue(mockExpenses);

      const spikes = await calculateSpendingSpikes('u1', undefined, 1);
      expect(spikes.length).toBe(1);
      expect(spikes[0].description).toBe('Flight Tickets');
      expect(spikes[0].amount).toBe(15000);
    });
  });

  describe('7. Edge Cases & Resilience', () => {
    it('handles empty group with 0 expenses gracefully without NaN', async () => {
      const emptyGroup: Group = {
        id: 'g_empty',
        name: 'Empty Group',
        createdBy: u1,
        members: [u1],
        totalExpenses: 0,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(getGroupById).mockResolvedValue(emptyGroup);
      vi.mocked(getExpensesByGroupId).mockResolvedValue([]);

      const cuts = await calculateMemberCuts('g_empty', 'u1');
      expect(cuts.totalGroupSpend).toBe(0);
      expect(cuts.members[0].percentageOfTotal).toBe(0);
      expect(cuts.members[0].netBalance).toBe(0);
      expect(cuts.formattedSummary).not.toContain('NaN');

      const trends = await calculateSpendingTrends('u1', 'g_empty', 3);
      expect(trends.currentMonthSpent).toBe(0);
      expect(trends.monthOverMonthChangePct).toBeNull();
      expect(trends.dailyBurnRate).toBe(0);
      expect(trends.projectedMonthEndSpent).toBe(0);
      expect(trends.formattedSummary).not.toContain('NaN');

      const category = await calculateCategoryTimeline('u1', 'food', 'g_empty', 3);
      expect(category.totalSpent).toBe(0);
      expect(category.personalShare).toBe(0);
      expect(category.trendDirection).toBe('stable');
      expect(category.formattedSummary).not.toContain('NaN');
    });

    it('handles unequal multi-payer and complex decimal splits without rounding drift', async () => {
      const group: Group = {
        id: 'g_split',
        name: 'Trip',
        createdBy: u1,
        members: [u1, u2],
        totalExpenses: 100,
        createdAt: new Date().toISOString(),
      };

      const exp: Expense = {
        id: 'e1',
        groupId: 'g_split',
        description: 'Dinner',
        amount: 100,
        splitType: 'unequally',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        payers: [
          { amount: 60, user: u1 },
          { amount: 40, user: u2 },
        ],
        participants: [
          { amountOwed: 33.33, user: u1 },
          { amountOwed: 66.67, user: u2 },
        ],
        expenseCreator: u1,
      };

      vi.mocked(getGroupById).mockResolvedValue(group);
      vi.mocked(getExpensesByGroupId).mockResolvedValue([exp]);

      const cuts = await calculateMemberCuts('g_split', 'u1');
      const alice = cuts.members.find(m => m.userId === 'u1')!;
      const bob = cuts.members.find(m => m.userId === 'u2')!;

      expect(alice.totalPaid).toBe(60);
      expect(alice.totalConsumed).toBe(33.33);
      expect(alice.netBalance).toBe(26.67);

      expect(bob.totalPaid).toBe(40);
      expect(bob.totalConsumed).toBe(66.67);
      expect(bob.netBalance).toBe(-26.67);

      expect(alice.netBalance + bob.netBalance).toBeCloseTo(0, 2);
    });
  });

  describe('Budget Allocation Breakdown & Smart Auto-Suggestion', () => {
    it('accurately computes category caps sum, flexible pool, and overflow state', () => {
      const budget: GroupBudget = {
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

      const breakdown = computeBudgetBreakdown(budget);
      expect(breakdown.monthlyLimit).toBe(25000);
      expect(breakdown.totalCapped).toBe(23000);
      expect(breakdown.flexiblePool).toBe(2000);
      expect(breakdown.isOverAllocated).toBe(false);
      expect(breakdown.shortfall).toBe(0);
      expect(breakdown.categoryCount).toBe(5);
      expect(breakdown.categoriesList[0].key).toBe('Housing');
      expect(breakdown.categoriesList[0].limit).toBe(8000);
    });

    it('identifies overflow when category caps exceed monthly limit', () => {
      const budget: GroupBudget = {
        enabled: true,
        monthlyLimit: 22000,
        categoryLimits: {
          Housing: 8000,
          'Food and Drink': 5000,
          Shopping: 5000,
          Transportation: 3000,
          Entertainment: 2000,
        },
      };

      const breakdown = computeBudgetBreakdown(budget);
      expect(breakdown.isOverAllocated).toBe(true);
      expect(breakdown.shortfall).toBe(1000);
      expect(breakdown.flexiblePool).toBe(0);
    });

    it('smartly auto-reduces categories proportionally to resolve 1k shortfall (25k -> 22k with 23k caps)', () => {
      const caps = {
        Housing: 8000,
        'Food and Drink': 5000,
        Shopping: 5000,
        Transportation: 3000,
        Entertainment: 2000,
      };

      const result = calculateSmartCategoryReduction(caps, 22000);

      expect(result.success).toBe(true);
      expect(result.shortfall).toBe(1000);
      expect(result.totalCut).toBe(1000);
      expect(result.newTotalCapped).toBe(22000);
      expect(result.newFlexiblePool).toBe(0);

      // Verify each category was reduced cleanly to nice multiples of 100
      expect(result.suggestedLimits.Housing).toBe(7600); // 8000 - 400
      expect(result.suggestedLimits['Food and Drink']).toBe(4800); // 5000 - 200
      expect(result.suggestedLimits.Shopping).toBe(4800); // 5000 - 200
      expect(result.suggestedLimits.Transportation).toBe(2900); // 3000 - 100
      expect(result.suggestedLimits.Entertainment).toBe(1900); // 2000 - 100

      // Exact sum must equal 22,000
      const sum = Object.values(result.suggestedLimits).reduce((a, b) => a + b, 0);
      expect(sum).toBe(22000);

      // Diff metadata
      expect(result.categoryDiffs.Housing.cutAmount).toBe(400);
      expect(result.categoryDiffs.Housing.oldLimit).toBe(8000);
      expect(result.categoryDiffs.Housing.newLimit).toBe(7600);
    });

    it('returns zero cuts when target monthly budget is greater than or equal to category caps', () => {
      const caps = {
        Housing: 8000,
        'Food and Drink': 5000,
      };

      const result = calculateSmartCategoryReduction(caps, 15000);
      expect(result.totalCut).toBe(0);
      expect(result.shortfall).toBe(0);
      expect(result.suggestedLimits.Housing).toBe(8000);
      expect(result.suggestedLimits['Food and Drink']).toBe(5000);
      expect(result.newFlexiblePool).toBe(2000);
    });

    it('validates budget delta against flexible pool and minimum boundary', () => {
      const budget: GroupBudget = {
        enabled: true,
        monthlyLimit: 25000,
        categoryLimits: {
          Housing: 8000,
          Food: 5000,
        },
      };

      // Valid: 20k >= 13k caps
      const validCheck = validateBudgetDelta(budget, 20000);
      expect(validCheck.valid).toBe(true);
      expect(validCheck.flexiblePool).toBe(7000);

      // Invalid: 10k < 13k caps (shortfall of 3k)
      const invalidCheck = validateBudgetDelta(budget, 10000);
      expect(invalidCheck.valid).toBe(false);
      expect(invalidCheck.shortfall).toBe(3000);
      expect(invalidCheck.reason).toContain('exceed');

      // Invalid: below minimum 100
      const belowMin = validateBudgetDelta(budget, 50);
      expect(belowMin.valid).toBe(false);
      expect(belowMin.reason).toContain('Minimum monthly budget is ₹100');
    });
  });

  describe('7. Global Context Multi-Group Budget View & Navigation', () => {
    it('builds view-only group budgets snapshot with category allocations and navigation links', async () => {
      const g1: Group = {
        id: 'grp_1',
        name: 'Apartment Flatmates',
        currency: 'INR',
        createdBy: u1,
        members: [u1, u2],
        totalExpenses: 25000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        budget: {
          enabled: true,
          monthlyLimit: 30000,
          categoryLimits: {
            Rent: 18000,
            Groceries: 7000,
          },
        },
      };

      const g2: Group = {
        id: 'grp_2',
        name: 'Road Trip',
        currency: 'INR',
        createdBy: u1,
        members: [u1, u3],
        totalExpenses: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        budget: {
          enabled: false,
          monthlyLimit: 15000,
        },
      };

      const g3: Group = {
        id: 'grp_3',
        name: 'Casual Friends',
        currency: 'INR',
        createdBy: u1,
        members: [u1],
        totalExpenses: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getGroupsByUserId).mockResolvedValue([g1, g2, g3]);
      vi.mocked(getExpensesByUserId).mockResolvedValue([]);
      vi.mocked(getAllUserBalances).mockResolvedValue([]);

      const snapshot = await buildFinancialSnapshot('u1', undefined, 'what are our budgets?');

      expect(snapshot.scope).toBe('global');
      expect(snapshot.groupBudgets).toBeDefined();
      expect(snapshot.groupBudgets?.length).toBe(3);

      const b1 = snapshot.groupBudgets?.find((b) => b.groupId === 'grp_1');
      expect(b1).toBeDefined();
      expect(b1?.enabled).toBe(true);
      expect(b1?.monthlyLimit).toBe(30000);
      expect(b1?.totalCapped).toBe(25000);
      expect(b1?.flexiblePool).toBe(5000);

      const b2 = snapshot.groupBudgets?.find((b) => b.groupId === 'grp_2');
      expect(b2?.enabled).toBe(false);

      const b3 = snapshot.groupBudgets?.find((b) => b.groupId === 'grp_3');
      expect(b3?.monthlyLimit).toBe(0);

      // Verify formatted text has view-only banner and group links
      expect(snapshot.formattedText).toContain('ALL GROUPS BUDGET OVERVIEW (VIEW-ONLY ACCESS)');
      expect(snapshot.formattedText).toContain('Group "Apartment Flatmates" (ID: grp_1):');
      expect(snapshot.formattedText).toContain('Status: Budget Active');
      expect(snapshot.formattedText).toContain('Monthly Limit: ₹30,000');
      expect(snapshot.formattedText).toContain('Category Allocations Sum: ₹25,000 (2 active categories)');
      expect(snapshot.formattedText).toContain('Flexible Pool: ₹5,000');
      expect(snapshot.formattedText).toContain('Rent: ₹18,000 (60% of budget)');
      expect(snapshot.formattedText).toContain('Groceries: ₹7,000 (23.3% of budget)');
      expect(snapshot.formattedText).toContain('/groups/grp_1?tab=budget&action=edit-budget');

      expect(snapshot.formattedText).toContain('Group "Road Trip" (ID: grp_2):');
      expect(snapshot.formattedText).toContain('Status: Budget Disabled');

      expect(snapshot.formattedText).toContain('Group "Casual Friends" (ID: grp_3):');
      expect(snapshot.formattedText).toContain('Status: No budget configured');
    });
  });

  describe('8. Natural Budget Action Intent Detection (detectQueryIntent)', () => {
    it('accurately identifies various natural budget modification phrases', () => {
      const phrases = [
        'change the budget for test Group to ₹21,000',
        'change test Group budget to 21000',
        'update test Group budget to 21000',
        'modify Goa Trip budget to 15000',
        'adjust Flatmates budget to 25000',
        'set our monthly budget to 30000',
        'increase Goa budget by 5000',
        'decrease Apartment budget by 2000',
        'enable group budget',
        'disable budget',
        'set food budget to 8000',
      ];

      for (const phrase of phrases) {
        const result = detectQueryIntent(phrase);
        expect(result.intent, `Failed for phrase: "${phrase}"`).toBe('BUDGET_ACTION');
      }
    });
  });
});

