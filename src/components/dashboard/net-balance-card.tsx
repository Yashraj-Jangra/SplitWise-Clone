
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

import type { Expense, Settlement } from '@/types';
import { getExpensesByUserId, getSettlementsByUserId } from '@/lib/mock-data';

import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export function NetBalanceCard({ currentUserId }: { currentUserId: string }) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [userExpenses, userSettlements] = await Promise.all([
            getExpensesByUserId(currentUserId),
            getSettlementsByUserId(currentUserId),
        ]);
        setExpenses(userExpenses);
        setSettlements(userSettlements);
        setLoading(false);
    }, [currentUserId]);

    useEffect(() => {
        loadData();
        
        const handleDataChange = () => {
            console.log("data-changed event received, refetching balance data...");
            loadData();
        };

        window.addEventListener('data-changed', handleDataChange);

        return () => {
            window.removeEventListener('data-changed', handleDataChange);
        };
    }, [loadData]);

    const { netBalance, chartData, domain, yAxisOffset } = useMemo(() => {
        const allTransactions: ({ date: Date, amount: number })[] = [];

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
        
        const overallNetBalance = allTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        
        const dailyNetChanges = new Map<string, number>();
        allTransactions.forEach(t => {
            if (t.date >= startDate && t.date <= endDate) {
                const dateStr = format(startOfDay(t.date), 'yyyy-MM-dd');
                dailyNetChanges.set(dateStr, (dailyNetChanges.get(dateStr) || 0) + t.amount);
            }
        });
        
        const balanceBeforeWindow = allTransactions
            .filter(t => t.date < startDate)
            .reduce((sum, t) => sum + t.amount, 0);
            
        let cumulativeBalance = balanceBeforeWindow;
        let min = balanceBeforeWindow, max = balanceBeforeWindow;
        
        const historicalChartData = dateInterval.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            cumulativeBalance += dailyNetChanges.get(dateStr) || 0;
            if (cumulativeBalance < min) min = cumulativeBalance;
            if (cumulativeBalance > max) max = cumulativeBalance;
            return {
                date: format(date, 'MMM d'),
                balance: cumulativeBalance,
            };
        });

        const padding = Math.max(Math.abs(min), Math.abs(max)) * 0.1 || 10;
        const finalDomain: [number, number] = [min - padding, max + padding];
        
        const offset = (max / (max - min)) * 100;
        const yAxisOffset = isNaN(offset) || !isFinite(offset) ? 50 : offset;

        return {
            netBalance: overallNetBalance,
            chartData: historicalChartData,
            domain: finalDomain,
            yAxisOffset: yAxisOffset,
        };
    }, [expenses, settlements, currentUserId]);

    if (loading) {
        return <Skeleton className="h-[180px] w-full" />;
    }
    
    const isNegative = netBalance < 0;
    const finalColor = isNegative ? '#ef4444' : chartConfig.positive.color;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Net Balance</CardTitle>
                <CardDescription>Your overall financial position</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                <div className={cn("text-3xl font-bold mb-2")} style={{color: finalColor}}>
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
                                <linearGradient id="fillPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartConfig.positive.color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={chartConfig.positive.color} stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="fillNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                </linearGradient>

                                <clipPath id="clip-above">
                                    <rect x="0" y="0" width="100%" height={yAxisOffset + "%"} />
                                </clipPath>
                                <clipPath id="clip-below">
                                    <rect x="0" y={yAxisOffset + "%"} width="100%" height={(100 - yAxisOffset) + "%"} />
                                </clipPath>
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
                                stroke={chartConfig.positive.color}
                                fill="url(#fillPositive)"
                                strokeWidth={2}
                                clipPath="url(#clip-above)"
                            />
                            <Area
                                dataKey="balance"
                                type="monotone"
                                stroke="#ef4444"
                                fill="url(#fillNegative)"
                                strokeWidth={2}
                                clipPath="url(#clip-below)"
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
