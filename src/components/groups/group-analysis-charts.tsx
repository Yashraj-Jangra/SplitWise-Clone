
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Expense, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
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
import { useIsMobile } from '@/hooks/use-mobile';


interface GroupAnalysisChartsProps {
  expenses: Expense[];
  members: UserProfile[];
}

const MEMBER_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CATEGORY_CHART_COLORS = [
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
];

export function GroupAnalysisCharts({ expenses, members }: GroupAnalysisChartsProps) {
  const isMobile = useIsMobile();
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
  const [memberChartCategory, setMemberChartCategory] = useState<string>('all');
  
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
        
        expense.participants.forEach(participant => {
            acc[day][participant.user.uid] = (acc[day][participant.user.uid] || 0) + participant.amountOwed;
        });

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

  const totalShareByMember = useMemo(() => {
    if (!date?.from || !isValid(date.from) || !date.to || !isValid(date.to)) return [];

    const memberChartExpenses = validExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isInDateRange = expenseDate >= startOfDay(date.from!) && expenseDate <= endOfDay(date.to!);
      const isInCategory = memberChartCategory === 'all' || (expense.category || 'Other') === memberChartCategory;
      return isInDateRange && isInCategory;
    });

    const data = members.reduce((acc, member) => {
      acc[member.uid] = { name: getFullName(member.firstName, member.lastName), total: 0 };
      return acc;
    }, {} as Record<string, { name: string; total: number }>);

    memberChartExpenses.forEach(expense => {
      expense.participants.forEach(participant => {
        if (data[participant.user.uid]) {
          data[participant.user.uid].total += participant.amountOwed;
        }
      });
    });

    return Object.values(data).filter(d => d.total > 0).sort((a,b) => b.total - a.total);
  }, [validExpenses, members, date, memberChartCategory]);

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
            color: MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [members]);

  const barChartConfig = {
    total: { label: 'Total Share', color: 'hsl(var(--chart-1))' },
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
          <CardTitle>Global Filters</CardTitle>
          <CardDescription>Refine the charts below by date and category.</CardDescription>
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
          <CardTitle>Daily Expense Share</CardTitle>
          <CardDescription>Comparing each member's share of expenses per day. Affected by global filters.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
          <ChartContainer config={userChartConfig} className="h-[300px] md:h-[350px] w-full">
            <LineChart data={userSpendingOverTime} accessibilityLayer margin={{ left: -10, right: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`} className="text-xs" />
                <Tooltip
                    content={<ChartTooltipContent indicator="dot" nameKey="name"/>}
                />
                <Legend />
                {members.map(member => (
                    <Line
                        key={member.uid}
                        dataKey={member.uid}
                        type="linear"
                        stroke={`var(--color-${member.uid})`}
                        strokeWidth={2}
                        dot={false}
                        name={getFullName(member.firstName, member.lastName)}
                    />
                ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <CardTitle>Total Share by Member</CardTitle>
                        <CardDescription>Each member's total share of expenses.</CardDescription>
                    </div>
                    <Select value={memberChartCategory} onValueChange={setMemberChartCategory}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
          <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
            <ChartContainer config={barChartConfig} className="h-[220px] md:h-[250px] w-full">
              <BarChart data={totalShareByMember} layout="vertical" accessibilityLayer margin={{left: 0, right: 20}}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={5}
                  width={isMobile ? 70 : 80}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => isMobile && value.length > 8 ? `${value.substring(0, 8)}...` : value}
                />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                 <Bar dataKey="total" radius={4}>
                    {totalShareByMember.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]} />
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
            <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
                <ChartContainer config={barChartConfig} className="h-[220px] md:h-[250px] w-full">
                <BarChart data={expensesByCategory} layout="vertical" accessibilityLayer margin={{left: 10, right: 20}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={5} width={isMobile ? 80 : 100} className="text-xs" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => isMobile && value.length > 10 ? `${value.substring(0, 10)}...` : value} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="total" radius={4}>
                        {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />
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
