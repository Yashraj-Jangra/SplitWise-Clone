
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/lib/constants';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
  'hsl(var(--chart-7))', 'hsl(var(--chart-8))', 'hsl(var(--chart-9))', 'hsl(var(--chart-10))'
];

export function DynamicSpendingChart() {
  const { userProfile, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const { expensesByCategory, totalAmount } = useMemo(() => {
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

    const sortedData = Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    
    const total = sortedData.reduce((sum, item) => sum + item.total, 0);

    return { expensesByCategory: sortedData, totalAmount: total };
  }, [expenses]);
  
  const chartConfig = useMemo(() => {
    return expensesByCategory.reduce((acc, category, index) => {
        acc[category.name] = {
            label: category.name,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [expensesByCategory]);

  const activeData = activeCategory ? expensesByCategory.find(c => c.name === activeCategory) : null;
  const activePercentage = activeData && totalAmount > 0 ? (activeData.total / totalAmount * 100).toFixed(1) : null;


  if (authLoading || loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Dynamic Spending: Last 30 Days</CardTitle>
        <CardDescription>Your spending breakdown by category.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {expensesByCategory.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No spending data in the last 30 days.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-sm">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel hideIndicator />}
                />
                <Pie
                  data={expensesByCategory}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="100%"
                  paddingAngle={2}
                  onMouseEnter={(_, index) => setActiveCategory(expensesByCategory[index].name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                {activeData ? (
                    <>
                        <p className="text-sm text-muted-foreground">{activeData.name}</p>
                        <p className="text-2xl font-bold">{CURRENCY_SYMBOL}{activeData.total.toFixed(0)}</p>
                        <p className="text-xs text-primary">{activePercentage}%</p>
                    </>
                ) : (
                     <>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-2xl font-bold">{CURRENCY_SYMBOL}{totalAmount.toFixed(0)}</p>
                    </>
                )}
            </div>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
