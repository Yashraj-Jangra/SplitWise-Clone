
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockUserBalances, mockUsers } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Icons } from "@/components/icons";
import type { Balance } from "@/types";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

// This is a simplified version. Real balance calculation is complex.
// We'll show what the current user owes and is owed.
function getOverallBalanceSummary(userId: string): { totalOwedToUser: number; totalUserOwes: number } {
  let totalOwedToUser = 0;
  let totalUserOwes = 0;
  
  // This is a placeholder logic.
  // For mock, let's generate some concrete examples for specific users
  if (userId === "user1") { // Alice
      totalOwedToUser = 500 + 250; // Bob owes 500, Charlie owes 250
      totalUserOwes = 300; // Alice owes Diana 300
  }
  if (userId === "user2") { // Bob
      totalOwedToUser = 150;
      totalUserOwes = 650;
  }

  return { totalOwedToUser, totalUserOwes };
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
  
  // The server-side rendered page provides `currentUserId` for the initial render.
  // The client-side `useAuth` hook provides the interactive user.
  // We prioritize the client-side user once it has loaded.
  const displayUserId = !loading && currentUser ? currentUser.id : currentUserId;

  const { totalOwedToUser, totalUserOwes } = getOverallBalanceSummary(displayUserId);
  const netBalance = totalOwedToUser - totalUserOwes;

  // Mocked detailed balances for "Who you owe" and "Who owes you" - this should also be dynamic
  const youOwe = displayUserId === 'user1' ? [
    { user: mockUsers[3], amount: 300, avatarUrl: mockUsers[3].avatarUrl }, // Diana
  ] : [];
  const owesYou = displayUserId === 'user1' ? [
    { user: mockUsers[1], amount: 500, avatarUrl: mockUsers[1].avatarUrl }, // Bob
    { user: mockUsers[2], amount: 250, avatarUrl: mockUsers[2].avatarUrl }, // Charlie
  ] : [];

  if (loading) {
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
            <Icons.Home className="h-5 w-5 mr-2 rotate-45"/> Who You Owe ({CURRENCY_SYMBOL}{totalUserOwes.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {youOwe.length > 0 ? (
              youOwe.map((item) => (
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
            <Icons.Home className="h-5 w-5 mr-2 rotate-[225deg]"/> Who Owes You ({CURRENCY_SYMBOL}{totalOwedToUser.toFixed(2)})
          </h3>
          <ScrollArea className="h-[150px] pr-3">
            {owesYou.length > 0 ? (
              owesYou.map((item) => (
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
