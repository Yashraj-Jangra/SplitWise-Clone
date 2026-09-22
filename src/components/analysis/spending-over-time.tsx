
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
    <Card className="w-full min-w-0 max-w-full overflow-hidden">
      <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full min-w-0">
            <div>
                <CardTitle className="text-base sm:text-lg font-bold">Spending Over Time</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Daily spending across different categories.</CardDescription>
            </div>
             <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto min-w-0">
                <ToggleGroup type="single" value={chartView} onValueChange={(v) => { if (v) setChartView(v as any)}} size="sm" className="shrink-0 bg-muted/40 p-0.5 rounded-lg border border-border/40">
                    <ToggleGroupItem value="line" aria-label="Line chart" className="h-7 w-7 p-0 data-[state=on]:bg-background rounded-md"><Icons.LineChart className="h-3.5 w-3.5" /></ToggleGroupItem>
                    <ToggleGroupItem value="bar" aria-label="Bar chart" className="h-7 w-7 p-0 data-[state=on]:bg-background rounded-md"><Icons.Analysis className="h-3.5 w-3.5" /></ToggleGroupItem>
                </ToggleGroup>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[150px] flex-1 sm:flex-initial h-8 text-xs shrink-0 bg-muted/20 border-border/40 rounded-lg">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        {uniqueCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0 min-w-0 max-w-full overflow-hidden">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] text-center text-muted-foreground p-4">
            <Icons.LineChart className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No spending data in this period</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Try selecting a different date range preset above.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] sm:h-[300px] w-full min-w-0 max-w-full overflow-hidden">
              {chartView === 'line' ? (
                  <LineChart
                      accessibilityLayer
                      data={chartData}
                      margin={{
                        left: -12,
                        right: 8,
                        top: 10,
                        bottom: 0,
                      }}
                  >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={6}
                          minTickGap={20}
                          interval="preserveStartEnd"
                          tickFormatter={(value) => value}
                          fontSize={11}
                      />
                      <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                          width={42}
                          fontSize={11}
                          tickFormatter={(value) => `${CURRENCY_SYMBOL}${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
                      />
                      <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
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
                        left: -12,
                        right: 8,
                        top: 10,
                        bottom: 0,
                      }}
                   >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={6}
                          minTickGap={20}
                          interval="preserveStartEnd"
                          tickFormatter={(value) => value}
                          fontSize={11}
                      />
                      <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                          width={42}
                          fontSize={11}
                          tickFormatter={(value) => `${CURRENCY_SYMBOL}${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
                      />
                      <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
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
        )}
      </CardContent>
    </Card>
  );
}
