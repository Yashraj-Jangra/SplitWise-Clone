'use client';

import * as React from 'react';
import type { Group, Expense } from '@/types';
import { calculateGroupBudgetStats, type BudgetStatus, type SmartSuggestion } from '@/lib/budget-utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { SetBudgetDialog } from './set-budget-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface GroupBudgetTabProps {
  group: Group;
  expenses: Expense[];
  onOpenExpenseDialog?: () => void;
}

export function GroupBudgetTab({ group, expenses }: GroupBudgetTabProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [budgetDialogOpen, setBudgetDialogOpen] = React.useState(false);

  const stats = React.useMemo(() => {
    return calculateGroupBudgetStats(group, expenses, selectedDate);
  }, [group, expenses, selectedDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleResetToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  const now = new Date();
  const isCurrentMonth =
    selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth();

  return (
    <div className="space-y-6">
      {/* Month Toolbar & Configure Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 border border-border/40 p-3.5 rounded-2xl backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-lg hover:bg-muted/60"
            title="Previous Month"
          >
            <Icons.ChevronDown className="h-4 w-4 rotate-90" />
            <span className="sr-only">Previous Month</span>
          </Button>

          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold font-headline text-foreground tracking-tight">
              {stats.monthName} {stats.year}
            </h2>
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToCurrentMonth}
                className="h-6 text-[11px] font-medium px-2 rounded-md bg-muted/30 border-border/40"
              >
                Jump to Current
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-lg hover:bg-muted/60"
            title="Next Month"
          >
            <Icons.ChevronDown className="h-4 w-4 -rotate-90" />
            <span className="sr-only">Next Month</span>
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setBudgetDialogOpen(true)}
          className="h-9 rounded-xl text-xs font-semibold px-3.5 bg-background hover:bg-muted/50 border-border/50 gap-1.5 shadow-sm"
        >
          <Icons.Settings className="h-3.5 w-3.5 text-primary" />
          <span>{stats.hasBudget ? 'Adjust Budget' : 'Set Monthly Budget'}</span>
        </Button>
      </div>

      {/* No Budget Configured State */}
      {!stats.isEnabled ? (
        <Card className="border-border/40 bg-card/60 shadow-sm rounded-2xl overflow-hidden text-center p-8 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Icons.Currency className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold font-headline">No Monthly Budget Configured</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 text-sm text-muted-foreground">
            Set a monthly spending limit for {group.name} to track shared expenses, view daily safe burn rates, and receive automated budget alerts.
          </CardDescription>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => setBudgetDialogOpen(true)}
              className="h-10 rounded-xl px-5 font-semibold text-sm shadow-md"
            >
              <Icons.Add className="mr-1.5 h-4 w-4" />
              Configure {stats.monthName} Budget
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Status Indicator Banner */}
          <div
            className={cn(
              'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm',
              stats.status === 'healthy' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
              stats.status === 'caution' && 'bg-amber-500/10 border-amber-500/30 text-amber-300',
              stats.status === 'warning' && 'bg-orange-500/10 border-orange-500/30 text-orange-300',
              stats.status === 'overbudget' && 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                  stats.status === 'healthy' && 'bg-emerald-500/20 text-emerald-400',
                  stats.status === 'caution' && 'bg-amber-500/20 text-amber-400',
                  stats.status === 'warning' && 'bg-orange-500/20 text-orange-400',
                  stats.status === 'overbudget' && 'bg-rose-500/20 text-rose-400'
                )}
              >
                {stats.status === 'healthy' && <Icons.TrendingUp className="h-5 w-5" />}
                {stats.status === 'caution' && <Icons.History className="h-5 w-5" />}
                {stats.status === 'warning' && <Icons.TrendingDown className="h-5 w-5" />}
                {stats.status === 'overbudget' && <Icons.Close className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight text-foreground">
                  {stats.status === 'healthy' && `On Track: ${stats.percentageUsed.toFixed(0)}% of Budget Used`}
                  {stats.status === 'caution' && `Caution: ${stats.percentageUsed.toFixed(0)}% of Budget Used`}
                  {stats.status === 'warning' && `Approaching Limit: ${stats.percentageUsed.toFixed(0)}% Used`}
                  {stats.status === 'overbudget' && `Over Budget by ${CURRENCY_SYMBOL}${Math.abs(stats.remainingBudget).toFixed(0)}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.daysRemaining} {stats.daysRemaining === 1 ? 'day' : 'days'} remaining in {stats.monthName}
                  {stats.status !== 'overbudget' && ` • ${CURRENCY_SYMBOL}${stats.remainingBudget.toFixed(0)} safe balance left`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                  stats.status === 'healthy' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                  stats.status === 'caution' && 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                  stats.status === 'warning' && 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
                  stats.status === 'overbudget' && 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                )}
              >
                {stats.status === 'healthy' && 'Healthy'}
                {stats.status === 'caution' && 'Caution (75%)'}
                {stats.status === 'warning' && 'Warning (90%)'}
                {stats.status === 'overbudget' && 'Exceeded'}
              </span>
            </div>
          </div>

          {/* 4-Card Hero Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Spent This Month */}
            <Card className="border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Spent This Month</span>
                <Icons.Expense className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-sans text-foreground">
                  {CURRENCY_SYMBOL}{stats.totalSpentThisMonth.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {CURRENCY_SYMBOL}{stats.monthlyLimit.toLocaleString('en-IN')} target
                </p>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{stats.percentageUsed.toFixed(0)}%</span>
                  <span>100%</span>
                </div>
                <Progress
                  value={Math.min(100, stats.percentageUsed)}
                  className={cn(
                    'h-2 rounded-full',
                    stats.status === 'healthy' && '[&>div]:bg-emerald-500',
                    stats.status === 'caution' && '[&>div]:bg-amber-500',
                    stats.status === 'warning' && '[&>div]:bg-orange-500',
                    stats.status === 'overbudget' && '[&>div]:bg-rose-500'
                  )}
                />
              </div>
            </Card>

            {/* Card 2: Remaining Budget */}
            <Card className="border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Remaining Budget</span>
                <Icons.Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p
                  className={cn(
                    'text-2xl font-bold font-sans',
                    stats.remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {stats.remainingBudget >= 0 ? '' : '-'}
                  {CURRENCY_SYMBOL}{Math.abs(stats.remainingBudget).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.remainingBudget >= 0 ? 'Surplus allowance' : 'Over limit deficit'}
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/20 border border-border/30 rounded-lg p-1.5 text-center">
                {stats.daysRemaining} days left in cycle
              </div>
            </Card>

            {/* Card 3: Daily Safe Limit */}
            <Card className="border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Daily Safe Limit</span>
                <Icons.ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-sans text-foreground">
                  {CURRENCY_SYMBOL}{stats.dailySafeLimit.toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground">/day</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avg spent: {CURRENCY_SYMBOL}{stats.averageDailySpend.toFixed(0)}/day
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/20 border border-border/30 rounded-lg p-1.5 text-center">
                Recommended burn rate
              </div>
            </Card>

            {/* Card 4: Projected Month-End */}
            <Card className="border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Projected Finish</span>
                <Icons.Analysis className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p
                  className={cn(
                    'text-2xl font-bold font-sans',
                    stats.projectedVariance <= 0 ? 'text-foreground' : 'text-orange-400'
                  )}
                >
                  {CURRENCY_SYMBOL}{stats.projectedMonthEndSpend.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.projectedVariance <= 0
                    ? `~${CURRENCY_SYMBOL}${Math.abs(stats.projectedVariance).toFixed(0)} under budget`
                    : `~${CURRENCY_SYMBOL}${stats.projectedVariance.toFixed(0)} potential overrun`}
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/20 border border-border/30 rounded-lg p-1.5 text-center truncate">
                {stats.predictedExhaustionDay
                  ? `Depletes on day ${stats.predictedExhaustionDay}`
                  : 'On track to month end'}
              </div>
            </Card>
          </div>

          {/* Smart Suggestions & Insights Panel */}
          {stats.suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icons.Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Smart Suggestions & Pacing Insights
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.suggestions.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'rounded-2xl border p-4 backdrop-blur-sm transition-all shadow-sm space-y-1.5',
                      s.type === 'success' && 'bg-emerald-500/5 border-emerald-500/20',
                      s.type === 'info' && 'bg-primary/5 border-primary/20',
                      s.type === 'warning' && 'bg-amber-500/5 border-amber-500/20',
                      s.type === 'danger' && 'bg-rose-500/5 border-rose-500/20'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'p-1.5 rounded-lg shrink-0',
                            s.type === 'success' && 'bg-emerald-500/20 text-emerald-400',
                            s.type === 'info' && 'bg-primary/20 text-primary',
                            s.type === 'warning' && 'bg-amber-500/20 text-amber-400',
                            s.type === 'danger' && 'bg-rose-500/20 text-rose-400'
                          )}
                        >
                          <Icons.Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="font-semibold text-xs text-foreground truncate">{s.title}</h4>
                      </div>
                      {s.tag && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                          {s.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Breakdown & Top Spenders Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Breakdown (2 Cols) */}
            <Card className="lg:col-span-2 border-border/40 bg-card/60 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-headline">Category Breakdown</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Spending distribution for {stats.monthName}
                  </CardDescription>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {stats.categoryBreakdowns.length} Categories
                </span>
              </div>

              {stats.categoryBreakdowns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No categorized expenses logged in {stats.monthName}.
                </p>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {stats.categoryBreakdowns.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{cat.category}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({cat.expenseCount} {cat.expenseCount === 1 ? 'expense' : 'expenses'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cat.allocatedLimit ? (
                            <span className="text-[11px] text-muted-foreground">
                              Limit: {CURRENCY_SYMBOL}{cat.allocatedLimit.toFixed(0)}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'font-bold font-mono',
                              cat.isOverLimit ? 'text-rose-400' : 'text-foreground'
                            )}
                          >
                            {CURRENCY_SYMBOL}{cat.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(100, cat.percentageOfSpend)}
                        className="h-1.5 rounded-full bg-muted/40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Spenders (1 Col) */}
            <Card className="border-border/40 bg-card/60 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-headline">Top Payers</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Members who paid in {stats.monthName}
                  </CardDescription>
                </div>
                <Icons.Users className="h-4 w-4 text-primary" />
              </div>

              {stats.topSpenders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No payment records for {stats.monthName}.
                </p>
              ) : (
                <div className="space-y-3 pt-1">
                  {stats.topSpenders.map((spender, idx) => (
                    <div
                      key={spender.userId}
                      className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-3">
                          {idx + 1}
                        </span>
                        <Avatar className="h-7 w-7 border border-primary/20">
                          <AvatarImage src={spender.avatarUrl} alt={spender.name} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(spender.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold truncate">{spender.name}</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {CURRENCY_SYMBOL}{spender.amount.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Set/Edit Budget Dialog */}
      <SetBudgetDialog
        group={group}
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
      />
    </div>
  );
}
