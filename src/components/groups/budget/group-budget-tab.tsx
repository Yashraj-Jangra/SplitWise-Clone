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
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="space-y-4">
      {/* Docked Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-2.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden bg-muted/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-none hover:bg-muted"
              title="Previous Month"
            >
              <Icons.ChevronDown className="h-4 w-4 rotate-90" />
              <span className="sr-only">Previous Month</span>
            </Button>

            <div className="px-3 text-xs font-bold font-mono tracking-tight text-foreground select-none">
              {stats.monthName.toUpperCase()} {stats.year}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-none hover:bg-muted"
              title="Next Month"
            >
              <Icons.ChevronDown className="h-4 w-4 -rotate-90" />
              <span className="sr-only">Next Month</span>
            </Button>
          </div>

          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToCurrentMonth}
              className="h-8 text-[11px] font-bold uppercase tracking-wider px-2.5 rounded-md border-border bg-background hover:bg-muted"
            >
              Current Month
            </Button>
          )}

          {stats.isEnabled && (
            <Badge
              variant="outline"
              className={cn(
                'rounded-md text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border',
                stats.status === 'healthy' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                stats.status === 'caution' && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                stats.status === 'warning' && 'bg-orange-500/10 text-orange-400 border-orange-500/30',
                stats.status === 'overbudget' && 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              )}
            >
              {stats.status === 'healthy' && 'Healthy Pace'}
              {stats.status === 'caution' && 'Caution (75%)'}
              {stats.status === 'warning' && 'Warning (90%)'}
              {stats.status === 'overbudget' && 'Exceeded Limit'}
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => setBudgetDialogOpen(true)}
          className="h-8 rounded-md text-xs font-bold uppercase tracking-wider px-3.5 gap-1.5 shadow-sm"
        >
          <Icons.Settings className="h-3.5 w-3.5" />
          <span>{stats.hasBudget ? 'Adjust Target' : 'Set Budget'}</span>
        </Button>
      </div>

      {/* No Budget Configured State */}
      {!stats.isEnabled ? (
        <Card className="border border-border bg-card shadow-sm rounded-lg overflow-hidden text-center p-8 sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted border border-border mb-3 text-foreground">
            <Icons.Currency className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-bold">No Budget Set for {stats.monthName}</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1.5 text-xs text-muted-foreground">
            Set a monthly spending ceiling for {group.name} to track shared expenses, calculate daily safe burn rates, and receive automated pacing alerts.
          </CardDescription>
          <div className="mt-5 flex justify-center">
            <Button
              onClick={() => setBudgetDialogOpen(true)}
              className="h-9 rounded-md px-4 font-bold text-xs uppercase tracking-wider shadow-sm"
            >
              <Icons.Add className="mr-1.5 h-3.5 w-3.5" />
              Configure Budget
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* 4-Card Hero Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Spent This Month */}
            <Card className="border border-border bg-card rounded-lg shadow-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Spent This Month</span>
                <Icons.Expense className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                  {CURRENCY_SYMBOL}{stats.totalSpentThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mt-1">
                  <span>Target: {CURRENCY_SYMBOL}{stats.monthlyLimit.toLocaleString('en-IN')}</span>
                  <span className="font-bold text-foreground">{stats.percentageUsed.toFixed(0)}%</span>
                </div>
              </div>
              <Progress
                value={Math.min(100, stats.percentageUsed)}
                className={cn(
                  'h-1.5 rounded-sm bg-muted',
                  stats.status === 'healthy' && '[&>div]:bg-emerald-500',
                  stats.status === 'caution' && '[&>div]:bg-amber-500',
                  stats.status === 'warning' && '[&>div]:bg-orange-500',
                  stats.status === 'overbudget' && '[&>div]:bg-rose-500'
                )}
              />
            </Card>

            {/* Card 2: Remaining Budget */}
            <Card className="border border-border bg-card rounded-lg shadow-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Remaining Balance</span>
                <Icons.Wallet className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div>
                <p
                  className={cn(
                    'text-2xl sm:text-3xl font-black font-mono tracking-tight',
                    stats.remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {stats.remainingBudget >= 0 ? '' : '-'}
                  {CURRENCY_SYMBOL}{Math.abs(stats.remainingBudget).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  {stats.remainingBudget >= 0 ? `${stats.daysRemaining} days remaining` : 'Over monthly limit'}
                </p>
              </div>
              <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    stats.remainingBudget >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, 100 - stats.percentageUsed))}%` }}
                />
              </div>
            </Card>

            {/* Card 3: Daily Safe Limit */}
            <Card className="border border-border bg-card rounded-lg shadow-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Safe Daily Spend</span>
                <Icons.ShieldCheck className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                  {CURRENCY_SYMBOL}{stats.dailySafeLimit.toFixed(0)}
                  <span className="text-xs font-normal text-muted-foreground font-sans ml-0.5">/day</span>
                </p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  Avg Velocity: {CURRENCY_SYMBOL}{stats.averageDailySpend.toFixed(0)}/day
                </p>
              </div>
              <div className="h-1.5 rounded-sm bg-muted/60" />
            </Card>

            {/* Card 4: Projected Finish */}
            <Card className="border border-border bg-card rounded-lg shadow-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Projected Finish</span>
                <Icons.Analysis className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div>
                <p
                  className={cn(
                    'text-2xl sm:text-3xl font-black font-mono tracking-tight',
                    stats.projectedVariance <= 0 ? 'text-foreground' : 'text-orange-400'
                  )}
                >
                  {CURRENCY_SYMBOL}{stats.projectedMonthEndSpend.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                  {stats.projectedVariance <= 0
                    ? `~${CURRENCY_SYMBOL}${Math.abs(stats.projectedVariance).toFixed(0)} under cap`
                    : `~${CURRENCY_SYMBOL}${stats.projectedVariance.toFixed(0)} overrun`}
                </p>
              </div>
              <div className="h-1.5 rounded-sm bg-muted/60" />
            </Card>
          </div>

          {/* Budget Pacing & Threshold Status Bar */}
          <Card className="border border-border bg-card rounded-lg shadow-sm p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Cycle Progress</span>
                <span className="text-xs font-mono text-muted-foreground">
                  Day {stats.currentDayOfMonth} of {stats.daysInMonth} ({((stats.currentDayOfMonth / stats.daysInMonth) * 100).toFixed(0)}% elapsed)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;75%
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> 75%
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> 90%
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> 100%
                </span>
              </div>
            </div>

            {/* Segmented Progress Track */}
            <div className="relative h-3 w-full bg-muted rounded-md overflow-hidden border border-border/50">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  stats.status === 'healthy' && 'bg-emerald-500',
                  stats.status === 'caution' && 'bg-amber-500',
                  stats.status === 'warning' && 'bg-orange-500',
                  stats.status === 'overbudget' && 'bg-rose-500'
                )}
                style={{ width: `${Math.min(100, stats.percentageUsed)}%` }}
              />
              {/* Threshold Ticks */}
              <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-background/80" title="75% Threshold" />
              <div className="absolute top-0 bottom-0 left-[90%] w-[1px] bg-background/80" title="90% Threshold" />
            </div>
          </Card>

          {/* Smart Suggestions & Pacing Insights Panel */}
          {stats.suggestions.length > 0 && (
            <Card className="border border-border bg-card rounded-lg shadow-sm">
              <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Icons.Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Smart Insights & Recommendations
                  </CardTitle>
                </div>
                <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border-border">
                  {stats.suggestions.length} {stats.suggestions.length === 1 ? 'Insight' : 'Insights'}
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {stats.suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border bg-muted/20 p-3 space-y-1 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              s.type === 'success' && 'bg-emerald-500',
                              s.type === 'info' && 'bg-primary',
                              s.type === 'warning' && 'bg-amber-500',
                              s.type === 'danger' && 'bg-rose-500'
                            )}
                          />
                          <h4 className="font-bold text-xs text-foreground truncate">{s.title}</h4>
                        </div>
                        {s.tag && (
                          <span className="text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                            {s.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-3.5">{s.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown & Top Spenders Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Category Breakdown (2 Cols) */}
            <Card className="lg:col-span-2 border border-border bg-card rounded-lg shadow-sm">
              <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Category Breakdown
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Spending distribution for {stats.monthName}
                  </CardDescription>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {stats.categoryBreakdowns.length} Categories
                </span>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                {stats.categoryBreakdowns.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No categorized expenses logged in {stats.monthName}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {stats.categoryBreakdowns.map((cat, idx) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-muted-foreground font-bold w-4">
                              #{idx + 1}
                            </span>
                            <span className="font-medium text-foreground truncate">{cat.category}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({cat.expenseCount})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cat.allocatedLimit ? (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Cap: {CURRENCY_SYMBOL}{cat.allocatedLimit.toFixed(0)}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                'font-bold font-mono text-xs',
                                cat.isOverLimit ? 'text-rose-400' : 'text-foreground'
                              )}
                            >
                              {CURRENCY_SYMBOL}{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">
                              {cat.percentageOfSpend.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={Math.min(100, cat.percentageOfSpend)}
                          className="h-1 rounded-sm bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Spenders (1 Col) */}
            <Card className="border border-border bg-card rounded-lg shadow-sm">
              <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Top Payers
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Paid in {stats.monthName}
                  </CardDescription>
                </div>
                <Icons.Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                {stats.topSpenders.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No payments recorded for {stats.monthName}.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {stats.topSpenders.map((spender, idx) => (
                      <div
                        key={spender.userId}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-muted-foreground w-3">
                            {idx + 1}
                          </span>
                          <Avatar className="h-6 w-6 border border-border">
                            <AvatarImage src={spender.avatarUrl} alt={spender.name} />
                            <AvatarFallback className="text-[9px] bg-muted text-foreground font-bold">
                              {getInitials(spender.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate text-foreground">{spender.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-400 shrink-0">
                          {CURRENCY_SYMBOL}{spender.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
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
