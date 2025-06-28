
"use client";

import { useState, useMemo } from "react";
import type { Balance, UserProfile, Group, SimplifiedSettlement } from "@/types";
import { simplifyDebts } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AddSettlementDialog } from "@/components/settlements/add-settlement-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getFullName, getInitials } from "@/lib/utils";


interface GroupBalancesProps {
  balances: Balance[];
  group: Group;
  onSettlementAdded: () => void;
}

export function GroupBalances({ balances, group, onSettlementAdded }: GroupBalancesProps) {
  const [isSimplified, setIsSimplified] = useState(false);

  const membersWhoOwe = balances.filter(b => b.netBalance < 0);
  const membersOwed = balances.filter(b => b.netBalance > 0);
  const everythingIsSettled = membersWhoOwe.length === 0 && membersOwed.length === 0;

  const simplifiedSettlements = useMemo(() => {
    if (isSimplified && !everythingIsSettled) {
      return simplifyDebts(balances);
    }
    return [];
  }, [isSimplified, balances, everythingIsSettled]);

  const renderContent = () => {
    if (balances.length === 0) {
      return <p className="text-muted-foreground text-center py-4">No balances to show yet. Add some expenses!</p>;
    }

    if (everythingIsSettled) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <Icons.ShieldCheck className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <p className="text-lg font-semibold">All debts are settled!</p>
          <p>Everyone is balanced in this group.</p>
          <p className="text-xs mt-4">Visit the 'Analysis' tab to see spending charts.</p>
        </div>
      );
    }

    if (isSimplified) {
      return (
        <div className="space-y-3">
          <h4 className="font-semibold text-center text-muted-foreground">Simplified Settlement Plan</h4>
          {simplifiedSettlements.map((s, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                      <AvatarImage src={s.from.avatarUrl} alt={getFullName(s.from.firstName, s.from.lastName)} />
                      <AvatarFallback>{getInitials(s.from.firstName, s.from.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getFullName(s.from.firstName, s.from.lastName)}</span>
              </div>
              <div className="flex flex-col items-center text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{CURRENCY_SYMBOL}{s.amount.toFixed(2)}</span>
                  <Icons.ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-3 justify-end">
                  <span className="font-medium text-right">{getFullName(s.to.firstName, s.to.lastName)}</span>
                  <Avatar className="h-9 w-9">
                      <AvatarImage src={s.to.avatarUrl} alt={getFullName(s.to.firstName, s.to.lastName)} />
                      <AvatarFallback>{getInitials(s.to.firstName, s.to.lastName)}</AvatarFallback>
                  </Avatar>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default detailed view
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-2 text-red-600">Members Who Owe</h4>
          <div className="space-y-2">
            {membersWhoOwe.map(balance => (
              <div key={balance.user.uid} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={balance.user.avatarUrl} />
                    <AvatarFallback>{getInitials(balance.user.firstName, balance.user.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{getFullName(balance.user.firstName, balance.user.lastName)}</span>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  Owes {CURRENCY_SYMBOL}{Math.abs(balance.netBalance).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-green-600">Members Who Are Owed</h4>
          <div className="space-y-2">
            {membersOwed.map(balance => (
              <div key={balance.user.uid} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={balance.user.avatarUrl} />
                    <AvatarFallback>{getInitials(balance.user.firstName, balance.user.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{getFullName(balance.user.firstName, balance.user.lastName)}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  Is Owed {CURRENCY_SYMBOL}{balance.netBalance.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
            {!everythingIsSettled && (
              <div className="flex items-center space-x-2">
                  <Label htmlFor="simplify-switch" className="text-sm font-medium">Simplify Debts</Label>
                  <Switch
                      id="simplify-switch"
                      checked={isSimplified}
                      onCheckedChange={setIsSimplified}
                  />
              </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderContent()}
        <div className="pt-4 border-t flex justify-end">
            <AddSettlementDialog group={group} onSettlementAdded={onSettlementAdded} />
        </div>
      </CardContent>
    </Card>
  );
}
