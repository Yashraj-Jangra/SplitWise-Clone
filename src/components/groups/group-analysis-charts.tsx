
'use client';

import { useMemo } from 'react';
import type { Expense, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getFullName } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Icons } from '../icons';

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
  const totalPaidByMember = useMemo(() => {
    const data = members.reduce((acc, member) => {
      acc[member.uid] = { name: getFullName(member.firstName, member.lastName), total: 0 };
      return acc;
    }, {} as Record<string, { name: string; total: number }>);

    expenses.forEach(expense => {
      if (data[expense.paidBy.uid]) {
        data[expense.paidBy.uid].total += expense.amount;
      }
    });

    return Object.values(data).filter(d => d.total > 0).sort((a,b) => b.total - a.total);
  }, [expenses, members]);

  const expensesByCategory = useMemo(() => {
    const data = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);


  const barChartConfig = {
    total: { label: 'Total Paid', color: 'hsl(var(--chart-2))' },
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
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Who Paid for What?</CardTitle>
          <CardDescription>Total amount paid by each member in this group.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-[300px] w-full">
            <BarChart data={totalPaidByMember} layout="vertical" accessibilityLayer>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={80}
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
                <CardTitle>Group Spending by Category</CardTitle>
                <CardDescription>
                Breakdown of this group's spending by category.
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
                    outerRadius={100}
                    innerRadius={60}
                    labelLine={false}
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
  );
}
