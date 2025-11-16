
'use client';

import { useMemo, useState } from 'react';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))'
];

export function SpendingOverTime({ expenses }: { expenses: Expense[] }) {
  const { chartData, chartConfig } = useMemo(() => {
    if (expenses.length === 0) {
      return { chartData: [], chartConfig: {} };
    }

    const categories = [...new Set(expenses.map(e => e.category || 'Other'))];
    
    const config: ChartConfig = categories.reduce((acc, category, index) => {
        acc[category] = {
            label: category,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);

    const expensesByDate: Record<string, Record<string, number>> = {};
    expenses.forEach(expense => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd');
      const category = expense.category || 'Other';
      if (!expensesByDate[date]) {
        expensesByDate[date] = {};
      }
      expensesByDate[date][category] = (expensesByDate[date][category] || 0) + expense.amount;
    });

    const dates = Object.keys(expensesByDate).map(d => new Date(d));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const interval = eachDayOfInterval({ start: minDate, end: maxDate });

    const data = interval.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dailyData: Record<string, string | number> = {
        date: format(date, 'MMM d'),
      };
      categories.forEach(category => {
        dailyData[category] = expensesByDate[dateKey]?.[category] || 0;
      });
      return dailyData;
    });

    return { chartData: data, chartConfig: config };
  }, [expenses]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Over Time</CardTitle>
        <CardDescription>Daily spending across different categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                {Object.keys(chartConfig).map((category) => (
                    <Line
                        key={category}
                        dataKey={category}
                        type="monotone"
                        stroke={`var(--color-${category})`}
                        strokeWidth={2}
                        dot={false}
                    />
                ))}
            </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

