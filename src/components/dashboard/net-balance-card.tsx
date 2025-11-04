
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

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
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                             <Tooltip
                                content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value) => `${netBalance >= 0 ? '+' : '-'}${CURRENCY_SYMBOL}${Math.abs(Number(value)).toFixed(2)}`}
                                />
                                }
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                strokeWidth={2}
                                stroke={netBalance >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--accent))'}
                                fill={netBalance >= 0 ? 'hsla(var(--chart-2), 0.2)' : 'hsla(var(--accent), 0.2)'}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
