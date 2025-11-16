
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons, type IconName } from '@/components/icons';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { differenceInDays, startOfDay } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickInsightsProps {
    currentExpenses: Expense[];
    previousExpenses: Expense[];
}

interface Insight {
    icon: IconName;
    title: string;
    value: string;
    description: React.ReactNode;
    colorClass: string;
}

export function QuickInsights({ currentExpenses, previousExpenses }: QuickInsightsProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const insights: Insight[] = useMemo(() => {
        const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
        const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        let percentageChange = 0;
        if (previousTotal > 0) {
            percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
        } else if (currentTotal > 0) {
            percentageChange = 100;
        }
        
        const trendIcon = percentageChange > 1 ? <Icons.TrendingUp className="inline h-4 w-4" /> : percentageChange < -1 ? <Icons.TrendingDown className="inline h-4 w-4" /> : null;
        const trendColor = percentageChange > 1 ? 'text-destructive' : percentageChange < -1 ? 'text-green-500' : 'text-muted-foreground';

        const expensesByCategory = currentExpenses.reduce((acc, expense) => {
            const category = expense.category || 'Other';
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.keys(expensesByCategory).length > 0
            ? Object.entries(expensesByCategory).reduce((a, b) => a[1] > b[1] ? a : b)
            : ['N/A', 0];

        const dateRange = currentExpenses.length > 0 ? differenceInDays(
            new Date(Math.max(...currentExpenses.map(e => new Date(e.date).getTime()))),
            new Date(Math.min(...currentExpenses.map(e => new Date(e.date).getTime())))
        ) + 1 : 1;

        const avgDailySpend = currentTotal / dateRange;

        const calculatedInsights: Insight[] = [];

        calculatedInsights.push({
            icon: 'Wallet',
            title: 'Total Spent',
            value: `${CURRENCY_SYMBOL}${currentTotal.toFixed(2)}`,
            description: (
                <span className={cn('flex items-center gap-1', trendColor)}>
                    {trendIcon} {Math.abs(percentageChange).toFixed(0)}% vs. previous period
                </span>
            ),
            colorClass: 'text-primary'
        });

        if (topCategory[0] !== 'N/A') {
             calculatedInsights.push({
                icon: 'PieChart',
                title: 'Top Category',
                value: topCategory[0],
                description: `You spent ${CURRENCY_SYMBOL}${topCategory[1].toFixed(2)} in this category.`,
                colorClass: 'text-yellow-500'
            });
        }
        
         calculatedInsights.push({
            icon: 'Calendar',
            title: 'Avg. Daily Spend',
            value: `${CURRENCY_SYMBOL}${avgDailySpend.toFixed(2)}`,
            description: `Over the selected period of ${dateRange} days.`,
            colorClass: 'text-cyan-500'
        });

        calculatedInsights.push({
            icon: 'History',
            title: 'Transactions',
            value: `${currentExpenses.length}`,
            description: `Total expenses recorded in this period.`,
            colorClass: 'text-purple-500'
        });

        return calculatedInsights;

    }, [currentExpenses, previousExpenses]);
    
    useEffect(() => {
        if (insights.length <= 1) return;
        
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % insights.length);
        }, 5000); // Rotate every 5 seconds
        
        return () => clearInterval(interval);
    }, [insights.length]);

    if (currentExpenses.length === 0) {
      return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Quick Insights</CardTitle>
                <CardDescription>Actionable summaries of your spending.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                <p>No expense data for this period.</p>
            </CardContent>
        </Card>
      )
    }
    
    const activeInsight = insights[activeIndex];
    const Icon = Icons[activeInsight.icon];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Quick Insights</CardTitle>
                <CardDescription>Actionable summaries of your spending.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center justify-center"
                    >
                         <div className={cn("p-4 rounded-full mb-4", activeInsight.colorClass, 'bg-primary/10')}>
                            <Icon className={cn("h-8 w-8", activeInsight.colorClass)} />
                         </div>
                        <p className="text-sm text-muted-foreground">{activeInsight.title}</p>
                        <p className="text-3xl font-bold font-headline truncate max-w-[250px]">
                            {activeInsight.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 h-8">{activeInsight.description}</p>
                    </motion.div>
                </AnimatePresence>
            </CardContent>
             <div className="flex justify-center gap-2 pb-4">
                {insights.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                            "h-2 w-2 rounded-full bg-muted transition-all duration-300",
                            activeIndex === index && "w-6 bg-primary"
                        )}
                        aria-label={`Go to insight ${index + 1}`}
                    />
                ))}
            </div>
        </Card>
    );
}
