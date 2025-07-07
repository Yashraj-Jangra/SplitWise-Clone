
"use client";

import { useState, useMemo } from "react";
import type { Balance, UserProfile, Group, SimplifiedSettlement } from "@/types";
import { simplifyDebts } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AddSettlementDialog } from "@/components/settlements/add-settlement-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getFullName, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface GroupBalancesProps {
  balances: Balance[];
  group: Group;
  onSettlementAdded: () => void;
}

export function GroupBalances({ balances, group, onSettlementAdded }: GroupBalancesProps) {
  const [isSimplified, setIsSimplified] = useState(false);

  const everythingIsSettled = useMemo(() => balances.every(b => Math.abs(b.netBalance) < 0.01), [balances]);

  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
        const getStatus = (balance: number) => {
            if (balance > 0.01) return 0; // Owed
            if (balance < -0.01) return 2; // Owes
            return 1; // Settled
        };

        const statusA = getStatus(a.netBalance);
        const statusB = getStatus(b.netBalance);
        
        if (statusA !== statusB) {
            return statusA - statusB;
        }

        // Within the same status, sort by amount
        if (statusA === 0) { // Owed
            return b.netBalance - a.netBalance; // largest owed first
        }
        if (statusA === 2) { // Owes
            return a.netBalance - b.netBalance; // largest debt first
        }

        return getFullName(a.user.firstName, a.user.lastName).localeCompare(getFullName(b.user.firstName, b.user.lastName));
    });
  }, [balances]);


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
        </div>
      );
    }

    if (isSimplified) {
      return (
        <div className="space-y-3 p-4 sm:p-0">
          <h4 className="font-semibold text-center text-muted-foreground">Simplified Settlement Plan</h4>
          {simplifiedSettlements.map((s, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={s.from.avatarUrl} alt={getFullName(s.from.firstName, s.from.lastName)} />
                        <AvatarFallback>{getInitials(s.from.firstName, s.from.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate hidden sm:inline">{getFullName(s.from.firstName, s.from.lastName)}</span>
                </div>
                <div className="flex-1 flex flex-col items-center text-sm text-muted-foreground flex-shrink-0">
                    <span className="font-bold text-foreground text-base">{CURRENCY_SYMBOL}{s.amount.toFixed(2)}</span>
                    <Icons.ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <span className="font-medium text-right truncate hidden sm:inline">{getFullName(s.to.firstName, s.to.lastName)}</span>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={s.to.avatarUrl} alt={getFullName(s.to.firstName, s.to.lastName)} />
                        <AvatarFallback>{getInitials(s.to.firstName, s.to.lastName)}</AvatarFallback>
                    </Avatar>
                </div>
                 <div className="flex-shrink-0 ml-2">
                    <AddSettlementDialog
                        group={group}
                        onSettlementAdded={onSettlementAdded}
                        initialSettlement={{
                            paidById: s.from.uid,
                            paidToId: s.to.uid,
                            amount: s.amount,
                        }}
                        trigger={
                            <Button size="sm">Settle</Button>
                        }
                    />
                </div>
            </div>
          ))}
        </div>
      );
    }

    // Default detailed view
    return (
      <div className="divide-y divide-border/50">
        {sortedBalances.map(balance => {
          const isOwed = balance.netBalance > 0.01;
          const isDebtor = balance.netBalance < -0.01;
          const isSettled = !isOwed && !isDebtor;

          return (
            <div key={balance.user.uid} className="flex items-center justify-between py-3 px-4 sm:p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={balance.user.avatarUrl} alt={getFullName(balance.user.firstName, balance.user.lastName)} />
                  <AvatarFallback>{getInitials(balance.user.firstName, balance.user.lastName)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{getFullName(balance.user.firstName, balance.user.lastName)}</span>
              </div>
              <div className={cn(
                  "text-right font-semibold",
                  isOwed && "text-green-500",
                  isDebtor && "text-red-500",
                  isSettled && "text-muted-foreground"
              )}>
                {isOwed && `Is Owed ${CURRENCY_SYMBOL}${balance.netBalance.toFixed(2)}`}
                {isDebtor && `Owes ${CURRENCY_SYMBOL}${Math.abs(balance.netBalance).toFixed(2)}`}
                {isSettled && "Settled Up"}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <CardTitle className="flex items-center">
                    <Icons.Settle className="h-5 w-5 mr-2 text-primary" />
                    Group Balances
                </CardTitle>
                <CardDescription>Summary of who owes whom in this group.</CardDescription>
            </div>
             <div className="flex items-center justify-between sm:justify-end gap-4">
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
                 <AddSettlementDialog group={group} onSettlementAdded={onSettlementAdded} />
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
          {renderContent()}
      </CardContent>
    </Card>
  );
}
