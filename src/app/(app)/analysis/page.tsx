
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Expense } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { getExpensesByUserId } from '@/lib/api.client';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { TimelineFilter, type DateRangePreset } from '@/components/analysis/timeline-filter';
import { SpendingBreakdown } from '@/components/analysis/spending-breakdown';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickInsights } from '@/components/analysis/quick-insights';
import { BudgetPerformance } from '@/components/analysis/budget-performance';
import { SpendingOverTime } from '@/components/analysis/spending-over-time';
import { useIsMobile } from '@/hooks/use-mobile';
import { Icons } from '@/components/icons';

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-80 w-full lg:col-span-2" />
                <Skeleton className="h-80 w-full" />
            </div>
             <Skeleton className="h-96 w-full" />
        </div>
    )
}


export default function AnalysisPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [mobileHintDismissed, setMobileHintDismissed] = useState(false);

  const [dateRange, setDateRange] = useState<DateRangePreset>({
    id: 'last30',
    label: 'Last 30 Days',
    range: {
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    },
  });

  useEffect(() => {
    if (userProfile?.uid) {
      setLoading(true);
      getExpensesByUserId(userProfile.uid)
        .then(setAllExpenses)
        .finally(() => setLoading(false));
    }
  }, [userProfile?.uid]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange.range.from) return [];
    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= dateRange.range.from! && expenseDate <= (dateRange.range.to || dateRange.range.from!);
    });
  }, [allExpenses, dateRange]);
  
  const previousPeriodExpenses = useMemo(() => {
    if (!dateRange.range.from) return [];
    const { from, to } = dateRange.range;
    const duration = (to || from).getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration - 1);
    const prevTo = new Date(from.getTime() - 1);

    return allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= prevFrom && expenseDate <= prevTo;
    });

  }, [allExpenses, dateRange]);

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-foreground">Financial Health Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">An overview of your personal spending and budgets.</p>
        </div>

        {/* Mobile landscape hint — dismissible, non-blocking */}
        {isMobile && !mobileHintDismissed && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Icons.Analysis className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">Charts look best in landscape mode.</span>
            </div>
            <button
              onClick={() => setMobileHintDismissed(true)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss hint"
            >
              <Icons.Close className="h-4 w-4" />
            </button>
          </div>
        )}

        <TimelineFilter
            selectedRange={dateRange}
            onRangeChange={setDateRange}
            allExpenses={allExpenses}
            isMobile={!!isMobile}
        />

        <SpendingOverTime expenses={filteredExpenses} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <SpendingBreakdown
                    currentExpenses={filteredExpenses}
                    previousExpenses={previousPeriodExpenses}
                />
            </div>
            <QuickInsights 
                currentExpenses={filteredExpenses}
                previousExpenses={previousPeriodExpenses}
            />
        </div>

        <BudgetPerformance
          currentExpenses={filteredExpenses}
          dateRange={dateRange.range}
        />
    </div>
  );
}
