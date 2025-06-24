
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
    return (
        <Card className="col-span-1">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
    )
  }

  const isOwed = netBalance >= 0;

  return (
    <Card className="col-span-1 flex flex-col">
      <CardHeader>
        <CardTitle>Net Balance</CardTitle>
        <CardDescription>Your overall financial position across all groups.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center flex-grow">
        <div className={`text-5xl font-bold ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
            {CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
        </div>
        <p className="text-muted-foreground mt-2">
            {isOwed ? "You are owed" : "You owe"}
        </p>
      </CardContent>
      <CardContent className="flex justify-around text-center text-sm">
        <div>
            <p className="text-muted-foreground">Total Owed to You</p>
            <p className="font-semibold text-green-400">{CURRENCY_SYMBOL}{totalOwedToUser.toFixed(2)}</p>
        </div>
        <div>
            <p className="text-muted-foreground">Total You Owe</p>
            <p className="font-semibold text-red-400">{CURRENCY_SYMBOL}{totalUserOwes.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
