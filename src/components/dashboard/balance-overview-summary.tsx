
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getGroupBalances, getGroupsByUserId } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Icons } from "@/components/icons";
import type { Balance, Group, UserProfile } from "@/types";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import { getFullName, getInitials } from "@/lib/utils";

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
    <div className="p-6 rounded-md border border-border/50 bg-card/50 glass-pane">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
                <p className="text-muted-foreground mb-2">Your Net Balance</p>
                <p className={`text-4xl lg:text-5xl font-bold tracking-tighter ${isOwed ? 'text-primary' : 'text-accent'}`}>
                    {isOwed ? '+' : '-'}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                </p>
                <p className="text-muted-foreground mt-1">
                    {isOwed ? "You are owed overall." : "You owe overall."}
                </p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                 <div className="flex-1 text-center p-3 rounded-md bg-muted/30">
                    <p className="text-xs text-green-400 uppercase tracking-wider">Owed to you</p>
                    <p className="text-xl font-bold text-green-400">{CURRENCY_SYMBOL}{totalOwedToUser.toFixed(2)}</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-md bg-muted/30">
                    <p className="text-xs text-red-400 uppercase tracking-wider">You owe</p>
                    <p className="text-xl font-bold text-red-400">{CURRENCY_SYMBOL}{totalUserOwes.toFixed(2)}</p>
                </div>
            </div>
        </div>
    </div>
  );
}
