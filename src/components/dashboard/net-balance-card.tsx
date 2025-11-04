
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getExpensesByUserId, getSettlementsByUserId } from '@/lib/mock-data';
import type { Expense, Settlement } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
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

    const { netBalance, chartData } = useMemo(() => {
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

        // Chart data for last 30 days
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        
        const dailyNetChanges = new Map<string, number>();

        allTransactions.forEach(t => {
            const transactionDate = startOfDay(t.date);
            if (transactionDate >= startDate && transactionDate <= endDate) {
                const dateStr = format(transactionDate, 'yyyy-MM-dd');
                dailyNetChanges.set(dateStr, (dailyNetChanges.get(dateStr) || 0) + t.amount);
            }
        });
        
        let cumulativeBalance = 0;
        const historicalChartData = dateInterval.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            cumulativeBalance += dailyNetChanges.get(dateStr) || 0;
            return {
                date: format(date, 'MMM d'),
                balance: cumulativeBalance,
            };
        });


        return {
            netBalance: overallNetBalance,
            chartData: historicalChartData,
        };
    }, [expenses, settlements, currentUserId]);

    if (loading) {
        return <Skeleton className="h-[180px] w-full" />;
    }
    
    chartConfig.balance.color = netBalance >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
    const isNegative = netBalance < 0;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Net Balance</CardTitle>
                <CardDescription>Your overall financial position</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                <div className="text-3xl font-bold text-foreground mb-2">
                    {netBalance >= 0 ? '+' : '−'}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                </div>
                <div className="h-[60px] -ml-6 -mr-2">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <AreaChart 
                            accessibilityLayer 
                            data={chartData} 
                            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                        >
                             <Tooltip
                                cursor={false}
                                content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value, name, props) => (
                                        <div className="flex flex-col">
                                            <span>{props.payload.date}</span>
                                            <span className={cn("font-bold", `text-[color:var(--color-balance)]`)}>
                                                {Number(value) >= 0 ? '+' : '−'}{CURRENCY_SYMBOL}{Math.abs(Number(value)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                />
                                }
                            />
                             <YAxis domain={['auto', 'auto']} hide={true} reversed={isNegative} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                strokeWidth={2}
                                stroke="var(--color-balance)"
                                fill="var(--color-balance)"
                                fillOpacity={0.2}
                                allowDataOverflow={true}
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}

