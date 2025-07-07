
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/lib/constants';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function SpendingBreakdown() {
  const { userProfile, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      if (!userProfile?.uid) return;
      setLoading(true);
      const userExpenses = await getExpensesByUserId(userProfile.uid);
      setExpenses(userExpenses);
      setLoading(false);
    }
    if (userProfile) {
      loadExpenses();
    }
  }, [userProfile]);

  const expensesByCategory = useMemo(() => {
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
    const now = endOfDay(new Date());

    const recentExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= thirtyDaysAgo && expenseDate <= now;
    });

    const data = recentExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Show top 5 categories
  }, [expenses]);
  
  const barChartConfig = {
    total: { label: 'Total Spent', color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;


  if (authLoading || loading) {
    return (
        <Card className="h-full">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    );
  }

  if (expensesByCategory.length === 0) {
    return (
        <Card className="h-full flex flex-col items-center justify-center">
            <CardHeader className="text-center">
                 <div className="flex justify-center mb-4">
                    <Icons.Analysis className="h-16 w-16 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">No Recent Spending</CardTitle>
                <CardDescription>
                    Your spending analysis for the last 30 days will appear here.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="h-full">
        <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
            <CardDescription>
                Top 5 spending categories in the last 30 days.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={barChartConfig} className="h-[250px] w-full">
            <BarChart data={expensesByCategory} layout="vertical" accessibilityLayer margin={{left: 10, right: 30}}>
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={5} 
                    width={100} 
                    className="text-xs" 
                    stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                    cursor={false} 
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `${CURRENCY_SYMBOL}${Number(value).toFixed(2)}`} />} 
                />
                <Bar dataKey="total" radius={4}>
                    {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
