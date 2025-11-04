
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

const chartConfig = {
  balance: {
    label: "Balance",
  },
} satisfies ChartConfig;


export function NetBalanceCard({ currentUserId }: { currentUserId: string }) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const userExpenses = await getExpensesByUserId(currentUserId);
            setExpenses(userExpenses);
            setLoading(false);
        }
        loadData();
    }, [currentUserId]);

    const { netBalance, chartData } = useMemo(() => {
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

        let totalOwed = 0;
        let totalOwes = 0;

        const dailyNetChanges = new Map<string, number>();

        expenses.forEach(expense => {
            const userPaid = expense.payers.find(p => p.user.uid === currentUserId)?.amount || 0;
            const userOwed = expense.participants.find(p => p.user.uid === currentUserId)?.amountOwed || 0;
            const net = userPaid - userOwed;
            
            const expenseDateStr = format(startOfDay(new Date(expense.date)), 'yyyy-MM-dd');
            dailyNetChanges.set(expenseDateStr, (dailyNetChanges.get(expenseDateStr) || 0) + net);

            if (net > 0) totalOwed += net;
            if (net < 0) totalOwes += Math.abs(net);
        });

        let cumulativeBalance = 0;
        const chartData = dateInterval.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            cumulativeBalance += dailyNetChanges.get(dateStr) || 0;
            return {
                date: format(date, 'MMM d'),
                balance: cumulativeBalance,
            };
        });

        return {
            netBalance: totalOwed - totalOwes,
            chartData
        };
    }, [expenses, currentUserId]);

    if (loading) {
        return <Skeleton className="h-[180px] w-full" />;
    }
    
    chartConfig.balance.color = netBalance >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Net Balance</CardTitle>
                <CardDescription>Last 30 Days</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                <div className="text-3xl font-bold text-foreground mb-2">
                    {netBalance >= 0 ? '+' : '-'}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                </div>
                <div className="h-[60px] -ml-6 -mr-2">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <AreaChart accessibilityLayer data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                             <Tooltip
                                cursor={false}
                                content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value, name, props) => (
                                        <div className="flex flex-col">
                                            <span>{props.payload.date}</span>
                                            <span className="font-bold" style={{ color: chartConfig.balance.color }}>
                                                {Number(value) >= 0 ? '+' : '-'}{CURRENCY_SYMBOL}{Math.abs(Number(value)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                />
                                }
                            />
                             <YAxis domain={['auto', 'auto']} hide={true} />
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
