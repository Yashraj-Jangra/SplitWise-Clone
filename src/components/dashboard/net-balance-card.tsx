
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getExpensesByUserId, getSettlementsByUserId } from '@/lib/mock-data';
import type { Expense, Settlement } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis, XAxis, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const chartConfig = {
  balance: {
    label: "Balance",
  },
} satisfies ChartConfig;

export function NetBalanceCard({ currentUserId }: { currentUserId: string }) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [userExpenses, userSettlements] = await Promise.all([
                getExpensesByUserId(currentUserId),
                getSettlementsByUserId(currentUserId),
            ]);
            setExpenses(userExpenses);
            setSettlements(userSettlements);
            setLoading(false);
        }
        loadData();
    }, [currentUserId]);

    const { netBalance, chartData, minBalance, maxBalance } = useMemo(() => {
        const allTransactions: ({ type: 'expense' | 'settlement', date: Date, amount: number })[] = [];

        expenses.forEach(expense => {
            const userPaid = expense.payers.find(p => p.user.uid === currentUserId)?.amount || 0;
            const userOwed = expense.participants.find(p => p.user.uid === currentUserId)?.amountOwed || 0;
            const net = userPaid - userOwed;
            if (Math.abs(net) > 0.001) {
                allTransactions.push({ type: 'expense', date: new Date(expense.date), amount: net });
            }
        });

        settlements.forEach(settlement => {
            let amount = 0;
            if (settlement.paidBy.uid === currentUserId) {
                amount = settlement.amount;
            } else if (settlement.paidTo.uid === currentUserId) {
                amount = -settlement.amount;
            }
            if (Math.abs(amount) > 0.001) {
                allTransactions.push({ type: 'settlement', date: new Date(settlement.date), amount: amount });
            }
        });
        
        const overallNetBalance = allTransactions.reduce((sum, t) => sum + t.amount, 0);

        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        
        const dailyNetChanges = new Map<string, number>();

        allTransactions.forEach(t => {
            const transactionDate = startOfDay(t.date);
            const dateStr = format(transactionDate, 'yyyy-MM-dd');
            if (transactionDate >= startDate && transactionDate <= endDate) {
                dailyNetChanges.set(dateStr, (dailyNetChanges.get(dateStr) || 0) + t.amount);
            }
        });
        
        let cumulativeBalance = 0;
        let min = 0, max = 0;
        
        const historicalChartData = dateInterval.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const prevBalance = cumulativeBalance;
            cumulativeBalance += dailyNetChanges.get(dateStr) || 0;

            if (cumulativeBalance < min) min = cumulativeBalance;
            if (cumulativeBalance > max) max = cumulativeBalance;

            let status: 'up' | 'down' | 'neutral' = 'neutral';
            if (index > 0) {
              if (cumulativeBalance > prevBalance) status = 'up';
              else if (cumulativeBalance < prevBalance) status = 'down';
            }

            return {
                date: format(date, 'MMM d'),
                balance: cumulativeBalance,
                up: status === 'up' ? cumulativeBalance : null,
                down: status === 'down' ? cumulativeBalance : null,
                status: status,
            };
        });

        return {
            netBalance: overallNetBalance,
            chartData: historicalChartData,
            minBalance: min,
            maxBalance: max,
        };
    }, [expenses, settlements, currentUserId]);

    if (loading) {
        return <Skeleton className="h-[180px] w-full" />;
    }
    
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
                                <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip
                                cursor={false}
                                content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value, name, item) => {
                                        const numericValue = Number(value);
                                        const itemStatus = item.payload?.status;
                                        
                                        let colorClass = "text-foreground";
                                        if (itemStatus === 'up') colorClass = "text-green-500";
                                        if (itemStatus === 'down') colorClass = "text-red-500";
                                        
                                        return (
                                            <div className="flex flex-col">
                                                <span className={cn("font-bold", colorClass)}>
                                                    {numericValue >= 0 ? '+' : '−'}{CURRENCY_SYMBOL}{Math.abs(numericValue).toFixed(2)}
                                                </span>
                                            </div>
                                        )
                                    }}
                                />
                                }
                            />
                            <YAxis domain={[minBalance, maxBalance]} hide={true} />
                            <XAxis dataKey="date" hide={true} />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="up"
                                strokeWidth={2}
                                stroke="#22c55e"
                                fill="url(#fillGreen)"
                                connectNulls
                            />
                            <Area
                                type="monotone"
                                dataKey="down"
                                strokeWidth={2}
                                stroke="#ef4444"
                                fill="url(#fillRed)"
                                connectNulls
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}

