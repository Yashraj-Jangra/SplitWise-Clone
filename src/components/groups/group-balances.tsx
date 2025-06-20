"use client";

import type { Balance, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AddSettlementDialog } from "@/components/settlements/add-settlement-dialog"; // Re-use for settling up
import type { Group } from "@/types";


interface GroupBalancesProps {
  balances: Balance[]; // Calculated balances for the group
  group: Group;
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

// This is a simplified representation. Real "who owes whom" can be complex.
// For example, A owes B $10, B owes C $10, C owes A $10 (a loop).
// Or A owes B $10, A owes C $5.
// This mock will just show net balances for each member.
export function GroupBalances({ balances, group }: GroupBalancesProps) {
  
  const membersWhoOwe = balances.filter(b => b.netBalance < 0);
  const membersOwed = balances.filter(b => b.netBalance > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <Icons.Settle className="h-5 w-5 mr-2 text-primary" />
            Group Balances
        </CardTitle>
        <CardDescription>Summary of who owes whom in this group.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.length === 0 && <p className="text-muted-foreground text-center py-4">No balances to show yet. Add some expenses!</p>}
        
        {balances.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-red-600">Members Who Owe</h4>
              <ScrollArea className="h-[180px] pr-2">
                {membersWhoOwe.length > 0 ? membersWhoOwe.map(balance => (
                  <div key={balance.user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={balance.user.avatarUrl} />
                        <AvatarFallback>{getInitials(balance.user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{balance.user.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">
                      Owes {CURRENCY_SYMBOL}{Math.abs(balance.netBalance).toFixed(2)}
                    </span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">No one owes money currently.</p>}
              </ScrollArea>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-green-600">Members Who Are Owed</h4>
               <ScrollArea className="h-[180px] pr-2">
                {membersOwed.length > 0 ? membersOwed.map(balance => (
                  <div key={balance.user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={balance.user.avatarUrl} />
                        <AvatarFallback>{getInitials(balance.user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{balance.user.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      Is Owed {CURRENCY_SYMBOL}{balance.netBalance.toFixed(2)}
                    </span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">No one is owed money currently.</p>}
              </ScrollArea>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t flex justify-end">
            <AddSettlementDialog group={group} />
        </div>
        
        {/* TODO: Add a more sophisticated "Simplified Debts" section if possible */}
        {/* <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Simplified Debts</h4>
            <p className="text-xs text-muted-foreground">Alice owes Charlie ₹50.00</p>
            <p className="text-xs text-muted-foreground">Bob owes Charlie ₹20.00</p>
        </div> */}

      </CardContent>
    </Card>
  );
}