
'use client';

import { useMemo } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

import type { Expense, Settlement } from '@/types';

import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  balance: {
    label: "Balance",
  },
  positive: {
    label: "Positive",
    color: "hsl(var(--chart-2))",
  },
  negative: {
    label: "Negative",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface NetBalanceCardProps {
    expenses: Expense[];
    settlements: Settlement[];
    currentUserId: string;
}

export function NetBalanceCard({ expenses, settlements, currentUserId }: NetBalanceCardProps) {
    const { netBalance, chartData, domain, gradientOffset } = useMemo(() => {
        // 1. Consolidate all transactions into a single array
        const allTransactions: { date: Date, amount: number }[] = [];
        expenses.forEach(expense => {
            const userPaid = expense.payers.find(p => p.user.uid === currentUserId)?.amount || 0;
            const userOwed = expense.participants.find(p => p.user.uid === currentUserId)?.amountOwed || 0;
            const userNet = userPaid - userOwed;
            if(Math.abs(userNet) > 0) {
              allTransactions.push({ date: new Date(expense.date), amount: userNet });
            }
        });
        settlements.forEach(settlement => {
            if (settlement.paidBy.uid === currentUserId) {
                allTransactions.push({ date: new Date(settlement.date), amount: settlement.amount });
            } else if (settlement.paidTo.uid === currentUserId) {
                allTransactions.push({ date: new Date(settlement.date), amount: -settlement.amount });
            }
        });
        
        // 2. Calculate final net balance
        const overallNetBalance = allTransactions.reduce((sum, t) => sum + t.amount, 0);

        // 3. Prepare data for the chart (last 30 days)
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Group transactions by day
        const dailyNetChanges = new Map<string, number>();
        allTransactions.forEach(t => {
            if (t.date >= startDate && t.date <= endDate) {
                const dateStr = format(startOfDay(t.date), 'yyyy-MM-dd');
                dailyNetChanges.set(dateStr, (dailyNetChanges.get(dateStr) || 0) + t.amount);
            }
        });
        
        // Calculate the balance from *before* the 30-day window starts
        const balanceBeforeWindow = allTransactions
            .filter(t => t.date < startDate)
            .reduce((sum, t) => sum + t.amount, 0);
            
        let cumulativeBalance = balanceBeforeWindow;
        let minBalance = cumulativeBalance, maxBalance = cumulativeBalance;
        
        // Create the final chart data array
        const historicalChartData = dateInterval.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            cumulativeBalance += dailyNetChanges.get(dateStr) || 0;
            if (cumulativeBalance < minBalance) minBalance = cumulativeBalance;
            if (cumulativeBalance > maxBalance) maxBalance = cumulativeBalance;
            return {
                date: format(date, 'MMM d'),
                balance: cumulativeBalance,
            };
        });

        // 4. Calculate Chart Domain and Gradient Offset
        const padding = Math.max(Math.abs(minBalance), Math.abs(maxBalance)) * 0.1 || 10;
        const finalDomain: [number, number] = [minBalance - padding, maxBalance + padding];
        
        let offset = 0;
        if (finalDomain[1] > finalDomain[0]) {
            offset = finalDomain[1] / (finalDomain[1] - finalDomain[0]);
        }
        offset = Math.max(0, Math.min(1, offset)); // Clamp between 0 and 1

        return {
            netBalance: overallNetBalance,
            chartData: historicalChartData,
            domain: finalDomain,
            gradientOffset: offset,
        };
    }, [expenses, settlements, currentUserId]);

    const isNegative = netBalance < 0;
    const finalColor = isNegative ? 'text-red-500' : 'text-green-500';

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Net Balance</CardTitle>
                <CardDescription>Your overall financial position</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                <div className={cn("text-3xl font-bold mb-2", finalColor)}>
                    {netBalance >= 0 ? '+' : '−'}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                </div>
                <div className="h-[60px] -ml-6 -mr-2">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <AreaChart 
                            accessibilityLayer 
                            data={chartData} 
                            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                        >
                             <defs>
                                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={gradientOffset} stopColor={chartConfig.positive.color} stopOpacity={0.4} />
                                    <stop offset={gradientOffset} stopColor={chartConfig.negative.color} stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide={true} />
                            <YAxis domain={domain} hide={true} />
                             <Tooltip
                                cursor={false}
                                content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value) => {
                                        const numericValue = Number(value);
                                        const color = numericValue < 0 ? '#ef4444' : chartConfig.positive.color;
                                        return (
                                            <div className="font-bold" style={{ color: color }}>
                                                {numericValue >= 0 ? '+' : '−'}{CURRENCY_SYMBOL}{Math.abs(numericValue).toFixed(2)}
                                            </div>
                                        )
                                    }}
                                />
                                }
                            />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                            <Area
                                dataKey="balance"
                                type="monotone"
                                stroke="url(#splitColor)"
                                fill="url(#splitColor)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
