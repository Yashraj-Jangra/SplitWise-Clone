/**
 * SplitIt AI & RAG Type Definitions
 */

export interface RetrievedChunk {
  id: string;
  entityType: 'expense' | 'settlement' | 'group' | string;
  textChunk: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface VectorRecord {
  id: string;
  userId: string;
  groupId?: string | null;
  entityType: 'expense' | 'settlement' | 'group' | string;
  textChunk: string;
  embedding: number[];
  createdAt?: string;
  updatedAt?: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export type GuardrailBlockedReason = 'code_generation' | 'injection' | 'unsafe';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  isBlocked?: boolean;
  blockedReason?: GuardrailBlockedReason;
  budgetProposalId?: string;
  budgetProposal?: BudgetActionProposal;
}

export interface AIInsight {
  summary: string;
  generatedAt: string;
  cached?: boolean;
}

export interface CategorySuggestion {
  category: string;
  masterCategory: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface ReceiptScanResult {
  title: string;
  amount: number | null;
  date: string | null;
  category: string | null;
  notes: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

export type QueryIntent =
  | 'TREND'
  | 'CATEGORY_TIMELINE'
  | 'MEMBER_CUT'
  | 'BALANCE_LEDGER'
  | 'BUDGET_RUNRATE'
  | 'BUDGET_ACTION'
  | 'SPENDING_SPIKE'
  | 'SEMANTIC_SEARCH'
  | 'DRAFT'
  | 'GENERAL';

export interface SpendingTrendMonth {
  monthKey: string; // YYYY-MM
  label: string;    // e.g. "Sep 2026"
  personalSpent: number;
  groupTotalSpent?: number;
  expenseCount: number;
}

export interface SpendingTrendResult {
  scope: 'user' | 'group';
  groupName?: string;
  months: SpendingTrendMonth[];
  currentMonthSpent: number;
  previousMonthSpent: number;
  monthOverMonthChangePct: number | null; // e.g. +14.2 or -8.5
  dailyBurnRate: number;                 // current month average per day so far
  projectedMonthEndSpent: number;        // estimated total for full month
  memberTrends?: Array<{
    userId: string;
    name: string;
    currentMonthSpent: number;
    previousMonthSpent: number;
    changePct: number | null;
  }>;
  formattedSummary: string;
}

export interface CategoryTimelineMonth {
  monthKey: string;
  label: string;
  amount: number;
  expenseCount: number;
}

export interface CategoryTimelineResult {
  category: string;
  masterCategory?: string;
  totalSpent: number;
  personalShare: number;
  months: CategoryTimelineMonth[];
  topExpenses: Array<{
    description: string;
    amount: number;
    date: string;
    paidBy: string;
  }>;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  formattedSummary: string;
}

export interface MemberCutDetail {
  userId: string;
  name: string;
  username?: string;
  totalPaid: number;      // Amount member paid out of pocket
  totalConsumed: number;  // Amount member owed across splits ("cut")
  netBalance: number;     // totalPaid - totalConsumed (+ creditor, - debtor)
  percentageOfTotal: number; // Share of total group spending
  expenseCount: number;
}

export interface MemberCutResult {
  groupId: string;
  groupName: string;
  totalGroupSpend: number;
  memberCount: number;
  members: MemberCutDetail[];
  highestPayer: { name: string; amount: number };
  highestConsumer: { name: string; amount: number };
  formattedSummary: string;
}

export interface BudgetForecastResult {
  groupId: string;
  groupName: string;
  monthlyLimit: number;
  currentSpent: number;
  percentageUsed: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  currentDailySpend: number;
  projectedMonthEndSpend: number;
  willExceedBudget: boolean;
  recommendedDailyBudgetRemaining: number;
  formattedSummary: string;
}

export interface SpendingSpike {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  paidBy: string;
  groupName?: string;
}

export interface CategoryDiff {
  oldLimit: number;
  newLimit: number;
  cutAmount: number;
  percentageCut: number;
}

export interface BudgetActionProposal {
  /** What operation the user requested */
  action:
    | 'set_monthly_limit'
    | 'increase_monthly_limit'
    | 'decrease_monthly_limit'
    | 'enable_budget'
    | 'disable_budget'
    | 'set_category_limit'
    | 'remove_category_limit'
    | 'adjust_budget_with_categories';
  /** The group this budget action targets */
  groupId: string;
  groupName: string;
  /** New absolute monthly limit (for set/enable actions) */
  newMonthlyLimit?: number;
  /** Delta amount (for increase/decrease) */
  deltaAmount?: number;
  /** Current monthly limit before the change */
  currentMonthlyLimit?: number;
  /** Category key for category-level budget actions */
  categoryKey?: string;
  /** New limit for the category */
  newCategoryLimit?: number;

  // Auto-suggestion & compound fields
  isAutoSuggested?: boolean;
  shortfall?: number;
  categoryUpdates?: Record<string, number>;
  categoryDiffs?: Record<string, CategoryDiff>;

  /** Human-readable summary of what the AI proposes to change */
  summary: string;
  /** Unique request ID to correlate approval with the action */
  requestId: string;

  /** Timestamp created and 10-minute expiry time */
  createdAt?: number;
  expiresAt?: number;
}

