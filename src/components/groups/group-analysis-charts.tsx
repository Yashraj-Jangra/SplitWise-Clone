

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Expense, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, Pie, PieChart, Area, AreaChart } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getFullName } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Icons } from '../icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay, isValid, startOfWeek, startOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';


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
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
];

const MEMBER_CHART_COLORS = CHART_COLORS;
const CATEGORY_CHART_COLORS = CHART_COLORS;

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
  const [memberChartView, setMemberChartView] = useState<'bar' | 'pie'>('bar');
  const [categoryChartView, setCategoryChartView] = useState<'pie' | 'bar'>('pie');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [lineType, setLineType] = useState<"linear" | "monotone" | "step">("linear");
  const [timeChartView, setTimeChartView] = useState<'line' | 'bar'>('line');
  
  useEffect(() => {
    setDate({ from: minDate, to: maxDate });
  }, [minDate, maxDate]);

  const uniqueCategories = useMemo(() => {
    const allCategories = new Set(validExpenses.map(e => e.category || 'Other'));
    return ['all', ...Array.from(allCategories)];
  }, [validExpenses]);

  const dateFilteredExpenses = useMemo(() => {
    if (!date?.from || !isValid(date.from)) return [];
    const toDate = date.to && isValid(date.to) ? date.to : date.from;
    return validExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isInDateRange = expenseDate >= startOfDay(date.from!) && expenseDate <= endOfDay(toDate);
      return isInDateRange;
    });
  }, [validExpenses, date]);

  const dailyChartFilteredExpenses = useMemo(() => {
    if (selectedCategory === 'all') {
      return dateFilteredExpenses;
    }
    return dateFilteredExpenses.filter(expense => (expense.category || 'Other') === selectedCategory);
  }, [dateFilteredExpenses, selectedCategory]);


  const userSpendingOverTime = useMemo(() => {
    if (!date?.from || !date?.to || !isValid(date.from) || !isValid(date.to) || date.from > date.to) {
        return [];
    }
    
    const getGroupKey = (d: Date) => {
        if (frequency === 'weekly') {
            return format(startOfWeek(d), 'yyyy-MM-dd');
        }
        if (frequency === 'monthly') {
            return format(startOfMonth(d), 'yyyy-MM');
        }
        return format(d, 'yyyy-MM-dd');
    };

    const spendingByDateAndUser = dailyChartFilteredExpenses.reduce((acc, expense) => {
        const groupKey = getGroupKey(new Date(expense.date));
        if (!acc[groupKey]) acc[groupKey] = {};
        
        expense.participants.forEach(participant => {
            acc[groupKey][participant.user.uid] = (acc[groupKey][participant.user.uid] || 0) + participant.amountOwed;
        });

        return acc;
    }, {} as Record<string, Record<string, number>>);
    
    const formatLabel = (key: string) => {
        const d = new Date(key);
         if (frequency === 'weekly') {
            return format(d, 'MMM d');
        }
        if (frequency === 'monthly') {
            return format(d, 'MMM yyyy');
        }
        return format(d, 'MMM d');
    }

    const sortedKeys = Object.keys(spendingByDateAndUser).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedKeys.map(key => {
        const entry: { [key: string]: string | number } = {
            date: formatLabel(key),
        };
        members.forEach(member => {
            entry[member.uid] = spendingByDateAndUser[key]?.[member.uid] || 0;
        });
        return entry;
    });

  }, [dailyChartFilteredExpenses, members, date, frequency]);

  const { totalShareByMember, totalMemberShareAmount } = useMemo(() => {
    const data = members.reduce((acc, member) => {
      acc[member.uid] = { name: getFullName(member.firstName, member.lastName), total: 0 };
      return acc;
    }, {} as Record<string, { name: string; total: number }>);
    let totalAmount = 0;

    dateFilteredExpenses.forEach(expense => {
      expense.participants.forEach(participant => {
        if (data[participant.user.uid]) {
          data[participant.user.uid].total += participant.amountOwed;
          totalAmount += participant.amountOwed;
        }
      });
    });

    return {
        totalShareByMember: Object.values(data).filter(d => d.total > 0).sort((a,b) => b.total - a.total),
        totalMemberShareAmount: totalAmount
    }
  }, [dateFilteredExpenses, members]);

  const { expensesByCategory, totalCategoryAmount } = useMemo(() => {
    let totalAmount = 0;
    const data = dateFilteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      totalAmount += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
        expensesByCategory: Object.entries(data)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total),
        totalCategoryAmount: totalAmount
    };
  }, [dateFilteredExpenses]);

  const userChartConfig = useMemo(() => {
    return members.reduce((acc, member, index) => {
        acc[member.uid] = {
            label: getFullName(member.firstName, member.lastName),
            color: MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [members]);

  const categoryChartConfig = useMemo(() => {
    return expensesByCategory.reduce((acc, category, index) => {
        acc[category.name] = {
            label: category.name,
            color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [expensesByCategory]);

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
  
  const customTooltipFormatter = (value: number, name: string, props: any, totalAmount: number) => {
    const percentage = totalAmount > 0 ? (value / totalAmount) * 100 : 0;
    return (
        <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{name}</span>
            <span className="text-foreground">{CURRENCY_SYMBOL}{Number(value).toFixed(2)}</span>
            <span className="text-muted-foreground text-xs">{percentage.toFixed(1)}% of total</span>
        </div>
    );
  };


  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Timeline Filter</CardTitle>
          <CardDescription>Refine the date range for all charts below.</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <CardTitle>Expense Share Over Time</CardTitle>
                    <CardDescription>Comparing each member's share of expenses.</CardDescription>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <ToggleGroup type="single" value={timeChartView} onValueChange={(v) => { if (v) setTimeChartView(v as any)}} size="sm">
                        <ToggleGroupItem value="line" aria-label="Line chart"><Icons.LineChart className="h-4 w-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="bar" aria-label="Bar chart"><Icons.Analysis className="h-4 w-4" /></ToggleGroupItem>
                    </ToggleGroup>
                    <Separator orientation="vertical" className="h-6" />
                    <ToggleGroup type="single" value={frequency} onValueChange={(v) => { if (v) setFrequency(v as any)}} size="sm">
                        <ToggleGroupItem value="daily">Days</ToggleGroupItem>
                        <ToggleGroupItem value="weekly">Weeks</ToggleGroupItem>
                        <ToggleGroupItem value="monthly">Months</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={lineType} onValueChange={(v) => setLineType(v as any)} disabled={timeChartView === 'bar'}>
                        <SelectTrigger className="w-[120px] h-9 text-xs">
                            <SelectValue placeholder="Line Style" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="monotone">Smooth</SelectItem>
                            <SelectItem value="step">Stepped</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
          <ChartContainer config={userChartConfig} className="h-[250px] md:h-[350px] w-full">
            {timeChartView === 'line' ? (
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
                            type={lineType}
                            stroke={`var(--color-${member.uid})`}
                            strokeWidth={2}
                            dot={false}
                            name={getFullName(member.firstName, member.lastName)}
                        />
                    ))}
                </LineChart>
            ) : (
                 <BarChart data={userSpendingOverTime} accessibilityLayer margin={{ left: -10, right: 20 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`} className="text-xs" />
                    <Tooltip
                        content={<ChartTooltipContent indicator="dot" nameKey="name"/>}
                    />
                    <Legend />
                    {members.map(member => (
                        <Bar
                            key={member.uid}
                            dataKey={member.uid}
                            stackId="a"
                            fill={`var(--color-${member.uid})`}
                            name={getFullName(member.firstName, member.lastName)}
                            radius={[4, 4, 0, 0]}
                        />
                    ))}
                </BarChart>
            )}
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <CardTitle>Total Share by Member</CardTitle>
                        <CardDescription>Each member's total share of expenses in the selected period.</CardDescription>
                    </div>
                     <ToggleGroup type="single" value={memberChartView} onValueChange={(v) => { if (v) setMemberChartView(v as 'bar' | 'pie')}} size="sm">
                        <ToggleGroupItem value="bar" aria-label="Toggle bar chart">
                            <Icons.Analysis className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="pie" aria-label="Toggle pie chart">
                            <Icons.PieChart className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
          <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
             {memberChartView === 'bar' ? (
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
                        content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => customTooltipFormatter(value as number, name as string, props, totalMemberShareAmount)} />}
                    />
                    <Bar dataKey="total" radius={4}>
                        {totalShareByMember.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ChartContainer>
             ) : (
                <ChartContainer config={userChartConfig} className="h-[220px] md:h-[250px] w-full">
                    <PieChart accessibilityLayer>
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => customTooltipFormatter(value as number, name as string, props, totalMemberShareAmount)} />} />
                        <Pie
                            data={totalShareByMember}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={isMobile ? 60 : 80}
                            innerRadius={isMobile ? 30 : 40}
                            paddingAngle={2}
                        >
                            {totalShareByMember.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]} />
                            ))}
                        </Pie>
                         <Legend
                          verticalAlign="bottom"
                          height={40}
                          iconSize={10}
                          formatter={(value, entry, index) => <span className="text-xs text-muted-foreground">{value}</span>}
                        />
                    </PieChart>
                </ChartContainer>
             )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <CardTitle>Spending by Category</CardTitle>
                        <CardDescription>Breakdown of spending for the selected period.</CardDescription>
                    </div>
                    <ToggleGroup type="single" value={categoryChartView} onValueChange={(v) => { if (v) setCategoryChartView(v as 'bar' | 'pie')}} size="sm">
                         <ToggleGroupItem value="bar" aria-label="Toggle bar chart">
                            <Icons.Analysis className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="pie" aria-label="Toggle pie chart">
                            <Icons.PieChart className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent className="px-0 pt-4 sm:p-6 sm:pt-4">
              {categoryChartView === 'bar' ? (
                <ChartContainer config={categoryChartConfig} className="h-[220px] md:h-[250px] w-full">
                    <BarChart data={expensesByCategory} layout="vertical" accessibilityLayer margin={{left: 10, right: 20}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={5} width={isMobile ? 80 : 100} className="text-xs" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => isMobile && value.length > 10 ? `${value.substring(0, 10)}...` : value} />
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => customTooltipFormatter(value as number, name as string, props, totalCategoryAmount)}/>} />
                        <Bar dataKey="total" radius={4}>
                            {expensesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
              ) : (
                <ChartContainer config={categoryChartConfig} className="h-[220px] md:h-[250px] w-full">
                    <PieChart accessibilityLayer>
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => customTooltipFormatter(value as number, name as string, props, totalCategoryAmount)} />} />
                        <Pie
                            data={expensesByCategory}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={isMobile ? 60 : 80}
                            innerRadius={isMobile ? 30 : 40}
                            paddingAngle={2}
                        >
                            {expensesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={40}
                          iconSize={10}
                          formatter={(value, entry, index) => <span className="text-xs text-muted-foreground">{value}</span>}
                        />
                    </PieChart>
                </ChartContainer>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
