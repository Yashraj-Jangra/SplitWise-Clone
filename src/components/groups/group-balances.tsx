
"use client";

import { useState, useMemo } from "react";
import type { Balance, User, Group } from "@/types";
import { simplifyDebts, type SimplifiedSettlement } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AddSettlementDialog } from "@/components/settlements/add-settlement-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


interface GroupBalancesProps {
  balances: Balance[];
  group: Group;
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

export function GroupBalances({ balances, group }: GroupBalancesProps) {
  const [isSimplified, setIsSimplified] = useState(false);

  const simplifiedSettlements = useMemo(() => {
    if (isSimplified) {
      return simplifyDebts(balances);
    }
    return [];
  }, [isSimplified, balances]);
  
  const membersWhoOwe = balances.filter(b => b.netBalance < 0);
  const membersOwed = balances.filter(b => b.netBalance > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center">
                    <Icons.Settle className="h-5 w-5 mr-2 text-primary" />
                    Group Balances
                </CardTitle>
                <CardDescription>Summary of who owes whom in this group.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="simplify-switch" className="text-sm font-medium">Simplify Debts</Label>
                <Switch
                    id="simplify-switch"
                    checked={isSimplified}
                    onCheckedChange={setIsSimplified}
                />
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.length === 0 ? (
           <p className="text-muted-foreground text-center py-4">No balances to show yet. Add some expenses!</p>
        ) : isSimplified ? (
             <div className="space-y-3">
                <h4 className="font-semibold text-center text-muted-foreground">Simplified Settlement Plan</h4>
                {simplifiedSettlements.length > 0 ? (
                    simplifiedSettlements.map((s, index) => (
                         <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={s.from.avatarUrl} alt={s.from.name} />
                                    <AvatarFallback>{getInitials(s.from.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{s.from.name}</span>
                            </div>
                            <div className="flex flex-col items-center text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">{CURRENCY_SYMBOL}{s.amount.toFixed(2)}</span>
                                <Icons.ArrowRight className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex items-center gap-3 justify-end">
                                <span className="font-medium text-right">{s.to.name}</span>
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={s.to.avatarUrl} alt={s.to.name} />
                                    <AvatarFallback>{getInitials(s.to.name)}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">All debts are settled!</p>
                )}
            </div>
        ) : (
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
      </CardContent>
    </Card>
  );
}
