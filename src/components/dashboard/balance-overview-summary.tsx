
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getGroupBalances, mockUsers } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Icons } from "@/components/icons";
import type { Balance, Group } from "@/types";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

// In a real app, this would be an API call
async function getOverallBalances(userId: string) {
    let totalOwedToUser = 0;
    let totalUserOwes = 0;
    // In a real app, you'd fetch all groups for the user
    // for now we use the mock data which is in-memory
    const { mockGroups } = await import('@/lib/mock-data');
    const userGroups = mockGroups.filter(g => g.members.some(m => m.id === userId));

    const allGroupBalances = await Promise.all(
        userGroups.map(group => getGroupBalances(group.id))
    );

    const owesYou: { user: any, amount: number, avatarUrl?: string }[] = [];
    const youOwe: { user: any, amount: number, avatarUrl?: string }[] = [];
    const userBalanceMap = new Map<string, { user: any, balance: number }>();


    allGroupBalances.flat().forEach(balance => {
        if (balance.user.id === userId) {
            if (balance.netBalance > 0) totalOwedToUser += balance.netBalance;
            if (balance.netBalance < 0) totalUserOwes += Math.abs(balance.netBalance);
        } else { // Other users
             const otherUserBalance = (userBalanceMap.get(balance.user.id)?.balance || 0) + balance.netBalance;
             userBalanceMap.set(balance.user.id, { user: balance.user, balance: otherUserBalance });
        }
    });
    
    // This part is a simplification. A true "who owes you" requires simplifying debts across all groups.
    // For this dashboard view, we'll keep it simple.

    return { totalOwedToUser, totalUserOwes, owesYou, youOwe };
}


const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

export function BalanceOverviewSummary({ currentUserId }: { currentUserId: string }) {
  const { currentUser, loading } = useAuth();
  const [balances, setBalances] = useState({ totalOwedToUser: 0, totalUserOwes: 0, youOwe: [], owesYou: [] });
  const [balanceLoading, setBalanceLoading] = useState(true);

  const displayUserId = !loading && currentUser ? currentUser.id : currentUserId;

  useEffect(() => {
    async function fetchData() {
        if (displayUserId) {
            setBalanceLoading(true);
            const summary = await getOverallBalances(displayUserId);
            setBalances(summary);
            setBalanceLoading(false);
        }
    }
    fetchData();
  }, [displayUserId]);

  const netBalance = balances.totalOwedToUser - balances.totalUserOwes;

  if (loading || balanceLoading) {
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
            <Icons.Home className="h-5 w-5 mr-2 rotate-45"/> Who You Owe ({CURRENCY_SYMBOL}{balances.totalUserOwes.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {balances.youOwe.length > 0 ? (
              balances.youOwe.map((item) => (
                <div key={item.user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.avatarUrl} alt={item.user.name} />
                      <AvatarFallback>{getInitials(item.user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{item.user.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {CURRENCY_SYMBOL}{item.amount.toFixed(2)}
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
            <Icons.Home className="h-5 w-5 mr-2 rotate-[225deg]"/> Who Owes You ({CURRENCY_SYMBOL}{balances.totalOwedToUser.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {balances.owesYou.length > 0 ? (
              balances.owesYou.map((item) => (
                <div key={item.user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.avatarUrl} alt={item.user.name} />
                      <AvatarFallback>{getInitials(item.user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{item.user.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {CURRENCY_SYMBOL}{item.amount.toFixed(2)}
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
