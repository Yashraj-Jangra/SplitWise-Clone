
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Sector } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
  'hsl(var(--chart-7))', 'hsl(var(--chart-8))', 'hsl(var(--chart-9))', 'hsl(var(--chart-10))'
];

const AnimatedActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
            transition: 'all 0.3s ease-in-out',
            transformOrigin: 'center center',
            transform: 'scale(1.05)',
        }}
      />
    </g>
  );
};


export function DynamicSpendingChart() {
  const { userProfile, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // State for animation
  const [isHovered, setIsHovered] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);

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

  const { expensesByCategory, totalAmount } = useMemo(() => {
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
    const now = endOfDay(new Date());

    const recentExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= thirtyDaysAgo && expenseDate <= now;
    });

    const data = recentExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    
    const total = sortedData.reduce((sum, item) => sum + item.total, 0);

    return { expensesByCategory: sortedData, totalAmount: total };
  }, [expenses]);
  
  // Animation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isHovered && expensesByCategory.length > 0) {
      interval = setInterval(() => {
        setAnimationIndex(prevIndex => (prevIndex + 1) % expensesByCategory.length);
        setRotationAngle(prevAngle => prevAngle - 360 / expensesByCategory.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isHovered, expensesByCategory.length]);

  const chartConfig = useMemo(() => {
    return expensesByCategory.reduce((acc, category, index) => {
        acc[category.name] = {
            label: category.name,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
        return acc;
    }, {} as ChartConfig);
  }, [expensesByCategory]);
  
  const currentActiveIndex = isHovered ? -1 : animationIndex;
  
  const activeData = activeCategory 
    ? expensesByCategory.find(c => c.name === activeCategory) 
    : isHovered ? null : expensesByCategory[animationIndex];
    
  const activePercentage = activeData && totalAmount > 0 ? (activeData.total / totalAmount * 100).toFixed(1) : null;


  if (authLoading || loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card 
        className="h-full flex flex-col"
        onMouseEnter={() => { setIsHovered(true); setActiveCategory(null); }}
        onMouseLeave={() => { setIsHovered(false); setAnimationIndex(0); }}
    >
      <CardHeader className="text-center">
        <CardTitle>Dynamic Spending: Last 30 Days</CardTitle>
        <CardDescription>Your spending breakdown by category.</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
        {expensesByCategory.length === 0 ? (
          <div className="text-center text-muted-foreground w-full">
            <p>No spending data in the last 30 days.</p>
          </div>
        ) : (
          <>
            <div className="w-full sm:w-1/2 flex-shrink-0 relative">
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <PieChart style={{ transition: 'transform 1s ease-in-out', transform: `rotate(${rotationAngle}deg)`}}>
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel hideIndicator />}
                    />
                    <Pie
                        data={expensesByCategory}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveCategory(expensesByCategory[index].name)}
                        onMouseLeave={() => setActiveCategory(null)}
                        activeIndex={currentActiveIndex}
                        activeShape={AnimatedActiveShape}
                    >
                        {expensesByCategory.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={chartConfig[entry.name]?.color} />
                        ))}
                    </Pie>
                    </PieChart>
                </ResponsiveContainer>
                </ChartContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    {activeData ? (
                        <>
                            <p className="text-sm text-muted-foreground">{activeData.name}</p>
                            <p className="text-2xl font-bold">{CURRENCY_SYMBOL}{activeData.total.toFixed(0)}</p>
                            <p className="text-xs text-primary">{activePercentage}%</p>
                        </>
                    ) : (
                       <div className="text-muted-foreground text-sm">Hover for details</div>
                    )}
                </div>
            </div>
            <div className="w-full sm:w-1/2 h-full flex flex-col">
                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="space-y-2">
                        {expensesByCategory.map((category, index) => {
                        const percentage = totalAmount > 0 ? (category.total / totalAmount) * 100 : 0;
                        const isAnimating = !isHovered && index === animationIndex;
                        return (
                            <div
                            key={category.name}
                            onMouseEnter={() => setActiveCategory(category.name)}
                            onMouseLeave={() => setActiveCategory(null)}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-md transition-colors",
                                activeCategory === category.name && "bg-muted",
                                isAnimating && "bg-muted scale-[1.03] shadow-md"
                            )}
                            >
                            <div className="flex items-center gap-2">
                                <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: chartConfig[category.name]?.color }}
                                />
                                <span className="text-sm text-muted-foreground">{category.name}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold">{CURRENCY_SYMBOL}{category.total.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                            </div>
                            </div>
                        )
                        })}
                    </div>
                </ScrollArea>
                <Separator className="my-2" />
                <div className="flex flex-col items-center pt-2">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{CURRENCY_SYMBOL}{totalAmount.toFixed(2)}</p>
                </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
