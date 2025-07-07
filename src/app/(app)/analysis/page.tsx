
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { classifyExpense, categoryList } from '@/lib/expense-categories';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function AnalysisPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState<DateRange | undefined>();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const uniqueCategories = useMemo(() => {
    const allCategories = new Set(expenses.map(e => e.category || 'Other'));
    return ['all', ...Array.from(allCategories)];
  }, [expenses]);

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

  useEffect(() => {
    // Set initial date on the client to avoid hydration mismatch
    setDate({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1);
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isInCategory = selectedCategory === 'all' || (expense.category || 'Other') === selectedCategory;
      return expenseDate >= fromDate && expenseDate < toDate && isInCategory;
    });
  }, [expenses, date, selectedCategory]);

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
    // This chart should show all categories regardless of the filter, but for the selected date range.
    const dateFilteredExpenses = expenses.filter(expense => {
       const expenseDate = new Date(expense.date);
       if (!date?.from) return false;
       const fromDate = date.from;
       const toDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1);
       return expenseDate >= fromDate && expenseDate < toDate;
    });

    const data = dateFilteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, date]);

  const barChartConfig = {
    total: { label: 'Total Spent', color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;


  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full" />
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
      
      <Card>
          <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine the data shown in the charts below.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    className="w-full sm:w-[300px] justify-start text-left font-normal"
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
               <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                    {uniqueCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </CardContent>
      </Card>


      {filteredExpenses.length === 0 ? (
         <Card className="col-span-full py-12 text-center">
            <CardHeader>
                <div className="flex justify-center mb-4">
                <Icons.Analysis className="h-16 w-16 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">No Data Available</CardTitle>
                <CardDescription>
                There are no expenses matching your filter criteria.
                </CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>
                Total expenses aggregated by month for the selected range and category.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                <BarChart data={expensesByMonth} accessibilityLayer margin={{ left: -10, right: 20 }}>
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
                    <Bar dataKey="total" fill="var(--color-total)" radius={2} />
                </BarChart>
                </ChartContainer>
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                Breakdown of total spending by category for the selected date range.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
                 <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <BarChart data={expensesByCategory} layout="vertical" accessibilityLayer margin={{left: 10, right: 30}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={5} width={100} className="text-xs" stroke="hsl(var(--muted-foreground))"/>
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="total" radius={2}>
                            {expensesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
