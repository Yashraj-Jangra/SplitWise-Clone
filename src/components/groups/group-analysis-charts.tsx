
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Expense, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getFullName } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Icons } from '../icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface GroupAnalysisChartsProps {
  expenses: Expense[];
  members: UserProfile[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function GroupAnalysisCharts({ expenses, members }: GroupAnalysisChartsProps) {
  const validExpenses = useMemo(() => expenses.filter(e => e.date && isValid(new Date(e.date))), [expenses]);

  const { minDate, maxDate } = useMemo(() => {
    if (validExpenses.length === 0) {
      const today = new Date();
      return { minDate: subDays(today, 30), maxDate: today };
    }
    const dates = validExpenses.map(e => new Date(e.date));
    return {
      minDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      maxDate: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
  }, [validExpenses]);
  
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  useEffect(() => {
    setDate({ from: minDate, to: maxDate });
  }, [minDate, maxDate]);

  const uniqueCategories = useMemo(() => {
    const allCategories = new Set(validExpenses.map(e => e.category || 'Other'));
    return ['all', ...Array.from(allCategories)];
  }, [validExpenses]);

  const filteredExpenses = useMemo(() => {
    if (!date?.from || !isValid(date.from) || !date.to || !isValid(date.to)) return [];

    return validExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isInCategory = selectedCategory === 'all' || (expense.category || 'Other') === selectedCategory;
      const isInDateRange = expenseDate >= startOfDay(date.from!) && expenseDate <= endOfDay(date.to!);
      return isInCategory && isInDateRange;
    });
  }, [validExpenses, date, selectedCategory]);

  const userSpendingOverTime = useMemo(() => {
    if (!date?.from || !date?.to || !isValid(date.from) || !isValid(date.to) || date.from > date.to) {
        return [];
    }

    const spendingByDateAndUser = filteredExpenses.reduce((acc, expense) => {
        const day = format(new Date(expense.date), 'yyyy-MM-dd');
        if (!acc[day]) acc[day] = {};
        acc[day][expense.paidBy.uid] = (acc[day][expense.paidBy.uid] || 0) + expense.amount;
        return acc;
    }, {} as Record<string, Record<string, number>>);

    const intervalDays = eachDayOfInterval({ start: date.from, end: date.to });

    return intervalDays.map(d => {
        const dayKey = format(d, 'yyyy-MM-dd');
        const entry: { [key: string]: string | number } = {
            date: format(d, 'MMM d'),
        };
        members.forEach(member => {
            entry[member.uid] = spendingByDateAndUser[dayKey]?.[member.uid] || 0;
        });
        return entry;
    });
  }, [filteredExpenses, members, date]);

  const totalPaidByMember = useMemo(() => {
    const data = members.reduce((acc, member) => {
      acc[member.uid] = { name: getFullName(member.firstName, member.lastName), total: 0 };
      return acc;
    }, {} as Record<string, { name: string; total: number }>);

    filteredExpenses.forEach(expense => {
      if (data[expense.paidBy.uid]) {
        data[expense.paidBy.uid].total += expense.amount;
      }
    });

    return Object.values(data).filter(d => d.total > 0).sort((a,b) => b.total - a.total);
  }, [filteredExpenses, members]);

  const expensesByCategory = useMemo(() => {
    const data = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const userChartConfig = useMemo(() => {
    return members.reduce((acc, member, index) => {
        acc[member.uid] = {
            label: getFullName(member.firstName, member.lastName),
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [members]);

  const barChartConfig = {
    total: { label: 'Total Paid', color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;

  if (expenses.length === 0) {
     return (
        <Card className="col-span-full py-12 text-center">
        <CardHeader>
            <div className="flex justify-center mb-4">
            <Icons.Analysis className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">No Analysis Available</CardTitle>
            <CardDescription>
            Add some expenses to this group to see charts and analysis.
            </CardDescription>
        </CardHeader>
    </Card>
     )
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Analysis Filters</CardTitle>
          <CardDescription>Refine the charts by date and category.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal">
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    {date?.from && isValid(date.from) ? (
                        date.to && isValid(date.to) ? (
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

      <Card>
        <CardHeader>
          <CardTitle>Daily Spending Comparison</CardTitle>
          <CardDescription>Comparing total amount paid by each member per day.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={userChartConfig} className="h-[400px] w-full">
            <AreaChart data={userSpendingOverTime} accessibilityLayer margin={{ left: 20, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`} />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                {members.map(member => (
                    <Area
                        key={member.uid}
                        dataKey={member.uid}
                        type="natural"
                        fill={`var(--color-${member.uid})`}
                        fillOpacity={0.2}
                        stroke={`var(--color-${member.uid})`}
                        stackId="a"
                        name={getFullName(member.firstName, member.lastName)}
                    />
                ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Who Paid?</CardTitle>
            <CardDescription>Total amount paid by each member for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
              <BarChart data={totalPaidByMember} layout="vertical" accessibilityLayer margin={{left: 10, right: 30}}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={5}
                  width={80}
                  className="text-xs"
                />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                 <Bar dataKey="total" radius={4}>
                    {totalPaidByMember.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Breakdown of spending for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                <BarChart data={expensesByCategory} layout="vertical" accessibilityLayer margin={{left: 10, right: 30}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={5} width={100} className="text-xs" />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="total" radius={4}>
                        {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

