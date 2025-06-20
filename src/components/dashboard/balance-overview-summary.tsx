"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockUserBalances, mockUsers, mockCurrentUser } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Icons } from "@/components/icons";
import type { Balance } from "@/types";

// This is a simplified version. Real balance calculation is complex.
// We'll show what the current user owes and is owed.
function getOverallBalanceSummary(userId: string): { totalOwedToUser: number; totalUserOwes: number } {
  let totalOwedToUser = 0;
  let totalUserOwes = 0;

  // This is a placeholder logic. In a real app, this would be calculated across all groups.
  // For mock, let's iterate mockUserBalances (which are specific to current user in mock data)
  mockUserBalances.forEach(balance => {
    if (balance.user.id === userId) { // Should always be true for mockUserBalances
      balance.owedBy.forEach(item => totalOwedToUser += item.amount);
      balance.owes.forEach(item => totalUserOwes += item.amount);
    }
  });
  // A more realistic mock might be something like:
  // Alice is owed 500 by Bob, 200 by Charlie. Total Owed to Alice = 700
  // Alice owes 300 to Diana. Total Alice Owes = 300
  // For now, we'll use this simple sum from mockUserBalances for current user.
  
  // Let's generate some more concrete examples for the current user (Alice)
  // Assuming Alice (user1) is the current user
  if (userId === "user1") {
      totalOwedToUser = 500 + 250; // Bob owes 500, Charlie owes 250
      totalUserOwes = 300; // Alice owes Diana 300
  }


  return { totalOwedToUser, totalUserOwes };
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

export function BalanceOverviewSummary() {
  const currentUser = mockCurrentUser;
  const { totalOwedToUser, totalUserOwes } = getOverallBalanceSummary(currentUser.id);

  const netBalance = totalOwedToUser - totalUserOwes;

  // Mocked detailed balances for "Who you owe" and "Who owes you"
  const youOwe = [
    { user: mockUsers[3], amount: 300, avatarUrl: mockUsers[3].avatarUrl }, // Diana
  ];
  const owesYou = [
    { user: mockUsers[1], amount: 500, avatarUrl: mockUsers[1].avatarUrl }, // Bob
    { user: mockUsers[2], amount: 250, avatarUrl: mockUsers[2].avatarUrl }, // Charlie
  ];


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