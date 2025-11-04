
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getGroupBalances, getGroupsByUserId } from '@/lib/mock-data';
import type { UserProfile, Balance } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Obligation {
    user: UserProfile;
    amount: number;
}

async function getOverallBalances(userId: string): Promise<Balance[]> {
    const userGroups = await getGroupsByUserId(userId);
    if (userGroups.length === 0) return [];
    
    const allGroupBalancesPromises = userGroups.map(group => getGroupBalances(group.id));
    const allGroupBalances = await Promise.all(allGroupBalancesPromises);

    const userBalanceMap = new Map<string, { user: UserProfile, netBalance: number }>();

    allGroupBalances.flat().forEach(balance => {
        if (balance.user.uid === userId) return;
        const existing = userBalanceMap.get(balance.user.uid) || { user: balance.user, netBalance: 0 };
        existing.netBalance += balance.netBalance;
        userBalanceMap.set(balance.user.uid, existing);
    });

    return Array.from(userBalanceMap.values());
}

export function ObligationsCard({ currentUserId, type }: { currentUserId: string; type: 'owed' | 'owes' }) {
    const [balances, setBalances] = useState<Balance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const overallBalances = await getOverallBalances(currentUserId);
            setBalances(overallBalances);
            setLoading(false);
        }
        loadData();
    }, [currentUserId]);

    const { total, obligations } = useMemo(() => {
        let totalAmount = 0;
        let obligationList: Obligation[] = [];

        if (type === 'owed') {
            // You are owed -> other people's balance is negative
            obligationList = balances
                .filter(b => b.netBalance < -0.01)
                .map(b => ({ user: b.user, amount: Math.abs(b.netBalance) }));
            totalAmount = obligationList.reduce((sum, item) => sum + item.amount, 0);
        } else {
            // You owe -> other people's balance is positive
            obligationList = balances
                .filter(b => b.netBalance > 0.01)
                .map(b => ({ user: b.user, amount: b.netBalance }));
            totalAmount = obligationList.reduce((sum, item) => sum + item.amount, 0);
        }

        return { total: totalAmount, obligations: obligationList.sort((a,b) => b.amount - a.amount) };
    }, [balances, type]);

    if (loading) {
        return <Skeleton className="h-[180px] w-full" />;
    }

    const title = type === 'owed' ? 'You Are Owed' : 'You Owe';
    const totalColor = type === 'owed' ? 'text-green-500' : 'text-red-500';

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground">{title}</CardTitle>
                <div className={`text-3xl font-bold ${totalColor}`}>
                    {CURRENCY_SYMBOL}{total.toFixed(2)}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 pt-0">
                <p className="text-xs text-muted-foreground">From {obligations.length} people</p>
                {obligations.length > 0 ? (
                    <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-4">
                            {obligations.slice(0,2).map(item => (
                                <div key={item.user.uid} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={item.user.avatarUrl} />
                                            <AvatarFallback>{getInitials(item.user.firstName, item.user.lastName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate">{getFullName(item.user.firstName, item.user.lastName)}</span>
                                    </div>
                                    <div className="text-sm font-semibold">{CURRENCY_SYMBOL}{item.amount.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">All settled up!</p>
                    </div>
                )}
                {obligations.length > 0 && <Button variant="secondary" size="sm" className="mt-auto">{type === 'owed' ? 'Remind All' : 'Settle Now'}</Button>}
            </CardContent>
        </Card>
    );
}
