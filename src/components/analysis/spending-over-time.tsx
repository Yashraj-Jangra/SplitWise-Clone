
'use client';

import { useMemo, useState } from 'react';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Icons } from '@/components/icons';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
  'hsl(var(--chart-7))', 'hsl(var(--chart-8))', 'hsl(var(--chart-9))', 'hsl(var(--chart-10))'
];

// Helper function to create a valid CSS identifier from a string
const sanitizeForCss = (name: string) => {
  return name.replace(/[^a-zA-Z0-9]/g, '-');
};

export function SpendingOverTime({ expenses }: { expenses: Expense[] }) {
  const [chartView, setChartView] = useState<'line' | 'bar'>('line');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const uniqueCategories = useMemo(() => {
    const allCategories = new Set(expenses.map(e => e.category || 'Other'));
    return ['all', ...Array.from(allCategories)];
  }, [expenses]);

  const { chartData, chartConfig } = useMemo(() => {
    const filteredExpenses = selectedCategory === 'all'
      ? expenses
      : expenses.filter(e => (e.category || 'Other') === selectedCategory);

    if (filteredExpenses.length === 0) {
      return { chartData: [], chartConfig: {} };
    }

    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    const categories = selectedCategory === 'all'
      ? sortedCategories
      : [selectedCategory];
    
    const config: ChartConfig = categories.reduce((acc, category, index) => {
        const sanitizedKey = sanitizeForCss(category);
        acc[sanitizedKey] = {
            label: category,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);

    const expensesByDate: Record<string, Record<string, number>> = {};
    filteredExpenses.forEach(expense => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd');
      const category = expense.category || 'Other';
      if (!expensesByDate[date]) {
        expensesByDate[date] = {};
      }
      expensesByDate[date][category] = (expensesByDate[date][category] || 0) + expense.amount;
    });

    const dates = Object.keys(expensesByDate).map(d => new Date(d));
    if (dates.length === 0) {
        return { chartData: [], chartConfig: config };
    }
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const interval = eachDayOfInterval({ start: minDate, end: maxDate });

    const data = interval.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dailyData: Record<string, string | number> = {
        date: format(date, 'MMM d'),
      };
      categories.forEach(category => {
        const sanitizedKey = sanitizeForCss(category);
        dailyData[sanitizedKey] = expensesByDate[dateKey]?.[category] || 0;
      });
      return dailyData;
    });

    return { chartData: data, chartConfig: config };
  }, [expenses, selectedCategory]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>Daily spending across different categories.</CardDescription>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                <ToggleGroup type="single" value={chartView} onValueChange={(v) => { if (v) setChartView(v as any)}} size="sm">
                    <ToggleGroupItem value="line" aria-label="Line chart"><Icons.LineChart className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="bar" aria-label="Bar chart"><Icons.Analysis className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
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
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            {chartView === 'line' ? (
                <LineChart
                    accessibilityLayer
                    data={chartData}
                    margin={{
                    left: 12,
                    right: 12,
                    }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`}
                    />
                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                    {Object.keys(chartConfig).map((key) => (
                        <Line
                            key={key}
                            dataKey={key}
                            name={chartConfig[key].label as string}
                            type="monotone"
                            stroke={`var(--color-${key})`}
                            strokeWidth={2}
                            dot={false}
                        />
                    ))}
                </LineChart>
            ) : (
                 <BarChart
                    accessibilityLayer
                    data={chartData}
                    margin={{
                    left: 12,
                    right: 12,
                    }}
                 >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`}
                    />
                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                     {Object.keys(chartConfig).map((key) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={`var(--color-${key})`}
                            name={chartConfig[key].label as string}
                        />
                    ))}
                 </BarChart>
            )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
