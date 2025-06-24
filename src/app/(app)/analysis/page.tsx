
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

export default function AnalysisPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

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

  const filteredExpenses = useMemo(() => {
    if (!date?.from) return expenses;
    const fromDate = date.from;
    const toDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1);
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= fromDate && expenseDate < toDate;
    });
  }, [expenses, date]);

  const expensesByMonth = useMemo(() => {
    const data = filteredExpenses.reduce((acc, expense) => {
      const month = format(new Date(expense.date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [filteredExpenses]);

  const expensesByCategory = useMemo(() => {
    const data = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const barChartConfig = {
    total: { label: 'Total Spent', color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;

  const pieChartConfig = useMemo(() => {
    return expensesByCategory.reduce((acc, item, index) => {
        acc[item.name] = {
            label: item.name,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [expensesByCategory]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Expense Analysis</h1>
        <p className="text-muted-foreground">Visualize your spending patterns.</p>
      </div>

      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[300px] justify-start text-left font-normal"
            >
              <Icons.Calendar className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(date.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {filteredExpenses.length === 0 ? (
         <Card className="col-span-full py-12 text-center">
            <CardHeader>
                <div className="flex justify-center mb-4">
                <Icons.Analysis className="h-16 w-16 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">No Data Available</CardTitle>
                <CardDescription>
                There are no expenses in the selected date range.
                </CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>
                Total expenses aggregated by month for the selected range.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                <BarChart data={expensesByMonth} accessibilityLayer>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                    tickFormatter={value => `${CURRENCY_SYMBOL}${value}`}
                    tickLine={false}
                    axisLine={false}
                    />
                    <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
                </ChartContainer>
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                Breakdown of your spending by category for the selected range.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                    <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    labelLine={false}
                    label={({
                        cx, cy, midAngle, innerRadius, outerRadius, percent, index
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  
                        return (percent * 100) > 5 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                    {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    </Pie>
                    <Legend/>
                </PieChart>
                </ChartContainer>
            </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
