

'use client';

import { useMemo, useState } from 'react';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend, Sector } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { getMasterCategory } from '@/lib/expense-categories';

interface SpendingBreakdownProps {
  currentExpenses: Expense[];
  previousExpenses: Expense[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
  'hsl(var(--chart-7))', 'hsl(var(--chart-8))',
];

const ActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
    return (
      <g>
        <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={fill} className="text-xl font-bold">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
         <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 8}
          fill={fill}
        />
      </g>
    );
};


export function SpendingBreakdown({ currentExpenses, previousExpenses }: SpendingBreakdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const { settings: siteSettings } = useSiteSettings();

  const { expensesByMasterCategory, totalAmount, previousExpensesByMasterCategory } = useMemo(() => {
    const currentCategoryData = currentExpenses.reduce((acc, expense) => {
      const masterCategory = expense.masterCategory || getMasterCategory(expense.category || 'Other', siteSettings.expenseCategories) || 'Uncategorized';
      acc[masterCategory] = (acc[masterCategory] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const previousCategoryData = previousExpenses.reduce((acc, expense) => {
      const masterCategory = expense.masterCategory || getMasterCategory(expense.category || 'Other', siteSettings.expenseCategories) || 'Uncategorized';
      acc[masterCategory] = (acc[masterCategory] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(currentCategoryData)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    
    const total = sortedData.reduce((sum, item) => sum + item.total, 0);

    return { expensesByMasterCategory: sortedData, totalAmount: total, previousExpensesByMasterCategory: previousCategoryData };
  }, [currentExpenses, previousExpenses, siteSettings.expenseCategories]);
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  const onPieLeave = () => {
    setActiveIndex(undefined);
  }

  const chartConfig = useMemo(() => {
    return expensesByMasterCategory.reduce((acc, category, index) => {
      acc[category.name] = {
        label: category.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [expensesByMasterCategory]);
  
  const getTrend = (categoryName: string, currentAmount: number) => {
    const previousAmount = previousExpensesByMasterCategory[categoryName] || 0;
    if (previousAmount === 0) {
        return currentAmount > 0 ? { icon: Icons.TrendingUp, color: 'text-destructive', change: '+100%' } : null;
    }
    const change = ((currentAmount - previousAmount) / previousAmount) * 100;
    if (Math.abs(change) < 1) return null;
    const TrendIcon = change > 0 ? Icons.TrendingUp : Icons.TrendingDown;
    const color = change > 0 ? 'text-destructive' : 'text-green-500';
    return { icon: TrendIcon, color, change: `${change > 0 ? '+' : ''}${change.toFixed(0)}%` };
  };

  return (
    <Card className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
      <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg font-bold">Spending Breakdown</CardTitle>
        <CardDescription className="text-xs sm:text-sm">How your spending is distributed across categories.</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 p-3.5 sm:p-6 min-w-0 max-w-full overflow-hidden">
        {expensesByMasterCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground p-4 w-full">
            <Icons.PieChart className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No spending data for this period</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Recorded expenses will display their category breakdown here.</p>
          </div>
        ) : (
          <>
            <div className="w-full h-[200px] sm:h-[220px] md:h-[250px] md:w-1/2 flex-shrink-0 relative min-w-0">
              <ChartContainer config={chartConfig} className="aspect-auto h-full w-full min-w-0 max-w-full overflow-hidden">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                        data={expensesByMasterCategory}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="78%"
                        paddingAngle={2}
                        activeIndex={activeIndex}
                        activeShape={ActiveShape}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                    >
                      {expensesByMasterCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            
            <div className="w-full md:w-1/2 h-full flex flex-col min-w-0">
                <ScrollArea className="flex-1 max-h-[220px] pr-2">
                    <div className="space-y-1.5">
                        {expensesByMasterCategory.map((category, index) => {
                            const percentage = totalAmount > 0 ? (category.total / totalAmount) * 100 : 0;
                            const trend = getTrend(category.name, category.total);
                            return (
                                <div
                                    key={category.name}
                                    onMouseEnter={() => onPieEnter(null, index)}
                                    onMouseLeave={onPieLeave}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-lg transition-all duration-200 border border-transparent",
                                        activeIndex === index ? "bg-muted border-border/40" : "hover:bg-muted/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: chartConfig[category.name]?.color }}/>
                                        <span className="text-xs sm:text-sm text-foreground truncate">{category.name}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs sm:text-sm font-semibold">{CURRENCY_SYMBOL}{category.total.toFixed(2)}</p>
                                        <div className="flex items-center justify-end gap-1">
                                             {trend && <trend.icon className={cn("h-3 w-3", trend.color)} />}
                                             <p className={cn("text-[10px] sm:text-xs", trend?.color || 'text-muted-foreground')}>{percentage.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
                <Separator className="my-2" />
                <div className="flex items-center justify-between px-2 pt-1">
                    <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
                    <p className="text-lg sm:text-xl font-bold font-headline">{CURRENCY_SYMBOL}{totalAmount.toFixed(2)}</p>
                </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
