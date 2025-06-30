
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getGroupBalances, getGroupsByUserId } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Icons } from "@/components/icons";
import type { Balance, UserProfile } from "@/types";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface OverallBalance {
    user: UserProfile;
    balance: number;
}

async function getOverallBalances(userId: string) {
    const userGroups = await getGroupsByUserId(userId);
    const allGroupBalancesPromises = userGroups.map(group => getGroupBalances(group.id));
    const allGroupBalances = await Promise.all(allGroupBalancesPromises);

    const userBalanceMap = new Map<string, OverallBalance>();

    allGroupBalances.flat().forEach(balance => {
        const existing = userBalanceMap.get(balance.user.uid) || { user: balance.user, balance: 0 };
        existing.balance += balance.netBalance;
        userBalanceMap.set(balance.user.uid, existing);
    });

    return Array.from(userBalanceMap.values());
}

export function BalanceOverviewSummary({ currentUserId }: { currentUserId: string }) {
  const [balances, setBalances] = useState<OverallBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        if (currentUserId) {
            setBalanceLoading(true);
            const summary = await getOverallBalances(currentUserId);
            setBalances(summary);
            setBalanceLoading(false);
        }
    }
    fetchData();
  }, [currentUserId]);

  const { totalOwedToUser, totalUserOwes, netBalance } = useMemo(() => {
    let totalOwed = 0;
    let totalOwes = 0;

    balances.forEach(item => {
        if (item.user.uid === currentUserId) return;
        if (item.balance > 0) totalOwes += item.balance;
        if (item.balance < 0) totalOwed += -item.balance;
    });
    
    return {
        totalOwedToUser: totalOwed,
        totalUserOwes: totalOwes,
        netBalance: totalOwed - totalOwes
    };
  }, [balances, currentUserId]);


  if (balanceLoading) {
    return <Skeleton className="h-36 w-full rounded-md" />
  }

  const isOwed = netBalance >= 0;

  return (
    <Card className="glass-pane overflow-hidden">
        <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-center md:gap-4">
                
                {/* Net Balance - Center on desktop, top on mobile */}
                <div className="flex flex-col items-center gap-2 text-center md:border-x md:border-border/50 md:px-4 py-4 md:py-0 md:order-2">
                    <p className="text-sm text-muted-foreground">Your Net Balance</p>
                    <p className={cn(
                        "text-4xl lg:text-5xl font-bold tracking-tighter",
                        isOwed ? 'text-primary' : 'text-accent'
                    )}>
                        {isOwed ? '+' : '-'}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {isOwed ? "You are owed overall" : "You owe overall"}
                    </p>
                </div>
                
                {/* Wrapper for side elements on mobile. 'md:contents' makes this div disappear on desktop, and its children become direct children of the parent grid. */}
                <div className="grid grid-cols-2 gap-4 md:contents">
                    {/* You are Owed - Left on desktop, part of a grid on mobile */}
                    <div className="flex flex-col items-center gap-1 text-center md:order-1">
                        <div className="flex items-center text-sm text-green-400">
                            <Icons.TrendingUp className="h-5 w-5 mr-2" />
                            <span className="font-semibold">You get back</span>
                        </div>
                        <span className="text-xl md:text-2xl font-bold text-green-400">
                            {CURRENCY_SYMBOL}{totalOwedToUser.toFixed(2)}
                        </span>
                    </div>

                    {/* You Owe - Right on desktop, part of a grid on mobile */}
                    <div className="flex flex-col items-center gap-1 text-center md:order-3">
                        <div className="flex items-center text-sm text-red-400">
                            <Icons.TrendingDown className="h-5 w-5 mr-2" />
                            <span className="font-semibold">You owe</span>
                        </div>
                        <span className="text-xl md:text-2xl font-bold text-red-400">
                            {CURRENCY_SYMBOL}{totalUserOwes.toFixed(2)}
                        </span>
                    </div>
                </div>

            </div>
        </CardContent>
    </Card>
  );
}
