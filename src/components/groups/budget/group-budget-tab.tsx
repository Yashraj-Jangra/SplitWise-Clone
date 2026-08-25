'use client';

import * as React from 'react';
import type { Group, Expense } from '@/types';
import { calculateGroupBudgetStats } from '@/lib/budget-utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { SetBudgetDialog } from './set-budget-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { defaultExpenseCategories } from '@/lib/expense-categories';

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

  // Helper to get category icon
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Food and Drink':
        return <Icons.Food className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Transportation':
        return <Icons.Car className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Housing':
        return <Icons.Home className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Utilities':
        return <Icons.Electricity className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Entertainment':
        return <Icons.Movie className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Shopping':
        return <Icons.ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Travel':
        return <Icons.Plane className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Education':
        return <Icons.Education className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'Health and Wellness':
        return <Icons.HeartPulse className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Icons.Wallet className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-lg hover:bg-muted"
            title="Previous Month"
          >
            <Icons.ChevronDown className="h-4 w-4 rotate-90" />
            <span className="sr-only">Previous Month</span>
          </Button>

          <h2 className="text-base font-bold text-foreground px-1 select-none">
            {stats.monthName} {stats.year}
          </h2>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-lg hover:bg-muted"
            title="Next Month"
          >
            <Icons.ChevronDown className="h-4 w-4 -rotate-90" />
            <span className="sr-only">Next Month</span>
          </Button>

          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToCurrentMonth}
              className="h-7 text-xs px-2.5 rounded-lg ml-1"
            >
              Today
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setBudgetDialogOpen(true)}
          className="h-8 text-xs font-semibold px-3 rounded-lg gap-1.5 shadow-sm"
        >
          <Icons.Settings className="h-3.5 w-3.5" />
          <span>{stats.hasBudget ? 'Edit Budget' : 'Set Budget'}</span>
        </Button>
      </div>

      {/* No Budget Configured State */}
      {!stats.isEnabled ? (
        <Card className="border-border/40 bg-card text-center p-8 sm:p-12 rounded-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Icons.Currency className="h-7 w-7" />
          </div>
          <CardTitle className="text-lg font-bold">No Monthly Budget Set</CardTitle>
          <CardDescription className="max-w-sm mx-auto mt-1 text-xs text-muted-foreground">
            Set a monthly spending limit for {group.name} to track shared expenses, safe daily burn rates, and pacing.
          </CardDescription>
          <div className="mt-5 flex justify-center">
            <Button
              onClick={() => setBudgetDialogOpen(true)}
              className="h-9 rounded-xl px-5 font-semibold text-xs shadow-md"
            >
              <Icons.Add className="mr-1.5 h-4 w-4" />
              Set {stats.monthName} Budget
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Unified Hero Centerpiece Card */}
          <Card className="border-border/40 bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 space-y-4">
              {/* Header line: Status + Days */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]',
                    stats.status === 'healthy' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                    stats.status === 'caution' && 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                    stats.status === 'warning' && 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
                    stats.status === 'overbudget' && 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  )}
                >
                  {stats.status === 'healthy' && 'On Track'}
                  {stats.status === 'caution' && 'Caution (75%)'}
                  {stats.status === 'warning' && 'Warning (90%)'}
                  {stats.status === 'overbudget' && 'Over Budget'}
                </span>
                <span className="text-muted-foreground font-medium">
                  {stats.daysRemaining} {stats.daysRemaining === 1 ? 'day' : 'days'} left in {stats.monthName}
                </span>
              </div>

              {/* Main Focal Point: Big Remaining Balance */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stats.remainingBudget >= 0 ? 'Remaining Balance' : 'Over Limit By'}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p
                    className={cn(
                      'text-3xl sm:text-4xl font-extrabold tracking-tight',
                      stats.remainingBudget >= 0 ? 'text-foreground' : 'text-rose-400'
                    )}
                  >
                    {CURRENCY_SYMBOL}{Math.abs(stats.remainingBudget).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    of {CURRENCY_SYMBOL}{stats.monthlyLimit.toLocaleString('en-IN')} budget
                  </span>
                </div>
              </div>

              {/* Smooth Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{stats.percentageUsed.toFixed(0)}% spent</span>
                  <span>{Math.max(0, 100 - stats.percentageUsed).toFixed(0)}% available</span>
                </div>
                <Progress
                  value={Math.min(100, stats.percentageUsed)}
                  className={cn(
                    'h-2.5 rounded-full bg-muted/60',
                    stats.status === 'healthy' && '[&>div]:bg-emerald-500',
                    stats.status === 'caution' && '[&>div]:bg-amber-500',
                    stats.status === 'warning' && '[&>div]:bg-orange-500',
                    stats.status === 'overbudget' && '[&>div]:bg-rose-500'
                  )}
                />
              </div>
            </div>

            {/* Bottom 3-Column Stats Ribbon */}
            <div className="grid grid-cols-3 divide-x divide-border/40 border-t border-border/40 bg-muted/15 py-3 px-2 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Spent So Far</p>
                <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  {CURRENCY_SYMBOL}{stats.totalSpentThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Safe Daily Burn</p>
                <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  {CURRENCY_SYMBOL}{stats.dailySafeLimit.toFixed(0)}
                  <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Projected Finish</p>
                <p
                  className={cn(
                    'text-sm sm:text-base font-bold mt-0.5',
                    stats.projectedVariance <= 0 ? 'text-foreground' : 'text-orange-400'
                  )}
                >
                  {CURRENCY_SYMBOL}{stats.projectedMonthEndSpend.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </Card>

          {/* Smart Pacing Banner (Single prioritized recommendation) */}
          {stats.suggestions.length > 0 && (
            <div
              className={cn(
                'rounded-xl border p-3.5 flex items-start gap-3 transition-colors',
                stats.suggestions[0].type === 'danger' && 'bg-rose-500/10 border-rose-500/30 text-rose-300',
                stats.suggestions[0].type === 'warning' && 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                stats.suggestions[0].type === 'success' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                stats.suggestions[0].type === 'info' && 'bg-primary/10 border-primary/30 text-primary'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  stats.suggestions[0].type === 'danger' && 'bg-rose-500/20 text-rose-400',
                  stats.suggestions[0].type === 'warning' && 'bg-amber-500/20 text-amber-400',
                  stats.suggestions[0].type === 'success' && 'bg-emerald-500/20 text-emerald-400',
                  stats.suggestions[0].type === 'info' && 'bg-primary/20 text-primary'
                )}
              >
                <Icons.Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-bold text-foreground">{stats.suggestions[0].title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stats.suggestions[0].description}
                </p>
              </div>
            </div>
          )}

          {/* Category Breakdown & Top Spenders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Category Breakdown (2 Cols) */}
            <Card className="lg:col-span-2 border-border/40 bg-card rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Category Breakdown</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {stats.categoryBreakdowns.length} {stats.categoryBreakdowns.length === 1 ? 'Category' : 'Categories'}
                </span>
              </div>

              {stats.categoryBreakdowns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No categorized expenses in {stats.monthName}.
                </p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {stats.categoryBreakdowns.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 rounded-md bg-muted/40 shrink-0">
                            {getCategoryIcon(cat.category)}
                          </div>
                          <span className="font-medium text-foreground truncate">{cat.category}</span>
                          <span className="text-[11px] text-muted-foreground">({cat.expenseCount})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {cat.allocatedLimit ? (
                            <span className="text-[11px] text-muted-foreground">
                              Cap: {CURRENCY_SYMBOL}{cat.allocatedLimit.toFixed(0)}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'font-bold',
                              cat.isOverLimit ? 'text-rose-400' : 'text-foreground'
                            )}
                          >
                            {CURRENCY_SYMBOL}{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted-foreground w-8 text-right">
                            {cat.percentageOfSpend.toFixed(0)}%
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
            <Card className="border-border/40 bg-card rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Top Payers</CardTitle>
                <Icons.Users className="h-4 w-4 text-muted-foreground" />
              </div>

              {stats.topSpenders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No payments in {stats.monthName}.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {stats.topSpenders.map((spender, idx) => (
                    <div
                      key={spender.userId}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/15 border border-border/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-3">
                          {idx + 1}
                        </span>
                        <Avatar className="h-7 w-7 border border-border/50">
                          <AvatarImage src={spender.avatarUrl} alt={spender.name} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                            {getInitials(spender.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate text-foreground">{spender.name}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0">
                        {CURRENCY_SYMBOL}{spender.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
