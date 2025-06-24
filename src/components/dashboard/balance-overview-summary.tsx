
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

  const { owesYou, youOwe, totalOwedToUser, totalUserOwes, netBalance } = useMemo(() => {
    const owesYouList: OverallBalance[] = [];
    const youOweList: OverallBalance[] = [];
    let totalOwed = 0;
    let totalOwes = 0;

    balances.forEach(item => {
        if (item.user.uid === currentUserId) return;
        if (item.balance > 0) youOweList.push({ user: item.user, balance: -item.balance });
        if (item.balance < 0) owesYouList.push({ user: item.user, balance: -item.balance });
    });

    owesYouList.forEach(item => totalOwed += item.balance);
    youOweList.forEach(item => totalOwes += item.balance);
    
    return {
        owesYou: owesYouList,
        youOwe: youOweList,
        totalOwedToUser: totalOwed,
        totalUserOwes: totalOwes,
        netBalance: totalOwed - totalOwes
    };
  }, [balances, currentUserId]);


  if (balanceLoading) {
    return <Card className="col-span-1 lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Balance Summary</CardTitle>
        <CardDescription>
          Your overall financial standing across all groups.
          Net: <span className={netBalance >= 0 ? "text-green-600" : "text-red-600"}>
            {CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)} {netBalance >= 0 ? "(You are owed)" : "(You owe)"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center">
            <Icons.Home className="h-5 w-5 mr-2 rotate-45"/> You Owe ({CURRENCY_SYMBOL}{totalUserOwes.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {youOwe.length > 0 ? (
              youOwe.map((item) => (
                <div key={item.user.uid} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.user.avatarUrl} alt={getFullName(item.user.firstName, item.user.lastName)} />
                      <AvatarFallback>{getInitials(item.user.firstName, item.user.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{getFullName(item.user.firstName, item.user.lastName)}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {CURRENCY_SYMBOL}{item.balance.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">You don't owe anyone anything. Great job!</p>
            )}
          </ScrollArea>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center">
            <Icons.Home className="h-5 w-5 mr-2 rotate-[225deg]"/> Who Owes You ({CURRENCY_SYMBOL}{totalOwedToUser.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {owesYou.length > 0 ? (
              owesYou.map((item) => (
                <div key={item.user.uid} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.user.avatarUrl} alt={getFullName(item.user.firstName, item.user.lastName)} />
                      <AvatarFallback>{getInitials(item.user.firstName, item.user.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{getFullName(item.user.firstName, item.user.lastName)}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {CURRENCY_SYMBOL}{item.balance.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No one owes you money right now.</p>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
