
'use client';

import { useMemo } from 'react';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays } from 'date-fns';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PredictiveInsightsProps {
    expenses: Expense[];
}

export function PredictiveInsights({ expenses }: PredictiveInsightsProps) {
  const { velocityPercentage, primaryDriver } = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sevenDaysAgo = subDays(new Date(), 7);

    let total30DaySpending = 0;
    let total7DaySpending = 0;
    const categorySpending = new Map<string, number>();

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= thirtyDaysAgo) {
        total30DaySpending += expense.amount;
        if (expenseDate >= sevenDaysAgo) {
          total7DaySpending += expense.amount;
        }
        
        const category = expense.category || 'Other';
        categorySpending.set(category, (categorySpending.get(category) || 0) + expense.amount);
      }
    });

    const avg30Day = total30DaySpending / 30;
    const avg7Day = total7DaySpending / 7;

    let percentageChange = 0;
    if (avg30Day > 0) {
      percentageChange = ((avg7Day - avg30Day) / avg30Day) * 100;
    }
    
    let driver = 'various categories';
    if(categorySpending.size > 0) {
        driver = [...categorySpending.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    return {
      velocityPercentage: percentageChange,
      primaryDriver: driver,
    };
  }, [expenses]);

  const isFaster = velocityPercentage > 0;
  const isSlower = velocityPercentage < 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Predictive Insights</CardTitle>
        <CardDescription>Your financial trends at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Spending Velocity</p>
                <div className={cn(
                    "flex items-baseline gap-2",
                    isFaster && "text-destructive",
                    isSlower && "text-green-500",
                )}>
                    <p className="text-3xl font-bold">
                        {velocityPercentage.toFixed(0) !== '0' ? `${isFaster ? '+' : ''}${velocityPercentage.toFixed(0)}%` : '0%'}
                    </p>
                    <p className="font-semibold">{isFaster ? 'faster' : isSlower ? 'slower' : 'steady'}</p>
                    {isFaster && <Icons.TrendingUp className="h-6 w-6" />}
                    {isSlower && <Icons.TrendingDown className="h-6 w-6" />}
                </div>
                 <p className="text-xs text-muted-foreground mt-1">
                    Driven primarily by <strong>{primaryDriver}</strong>.
                </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                <div className="bg-primary/20 p-2 rounded-full">
                    <Icons.AppLogo className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h4 className="font-semibold">Budget Assistant</h4>
                    <p className="text-sm text-muted-foreground">Your spending on "{primaryDriver}" is 20% above average. Create a budget?</p>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-1">Create Budget</Button>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
