
"use client";

import type { Settlement } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { getFullName, getInitials } from "@/lib/utils";

interface SettlementListItemProps {
  settlement: Settlement;
  currentUserId: string;
}

export function SettlementListItem({ settlement, currentUserId }: SettlementListItemProps) {
  const isPayer = settlement.paidBy.uid === currentUserId;
  const isPayee = settlement.paidTo.uid === currentUserId;

  return (
    <div className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-center w-12 flex-shrink-0">
          <Icons.Settle className="h-7 w-7 text-green-500 mx-auto"/>
        </div>
        <div className="flex-1 grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Avatar className="h-6 w-6">
                <AvatarImage src={settlement.paidBy.avatarUrl} alt={getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} />
                <AvatarFallback>{getInitials(settlement.paidBy.firstName, settlement.paidBy.lastName)}</AvatarFallback>
            </Avatar>
            <span>{isPayer ? 'You' : getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)}</span>
            <Icons.ArrowRight className="h-4 w-4 text-muted-foreground"/>
            <Avatar className="h-6 w-6">
                <AvatarImage src={settlement.paidTo.avatarUrl} alt={getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)} />
                <AvatarFallback>{getInitials(settlement.paidTo.firstName, settlement.paidTo.lastName)}</AvatarFallback>
            </Avatar>
            <span>{isPayee ? 'you' : getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <span>{format(new Date(settlement.date), "PPP")}</span>
             {settlement.notes && <p className="italic truncate max-w-[150px] sm:max-w-xs">• "{settlement.notes}"</p>}
          </div>
        </div>
        <div className="text-right">
            <p className="text-base font-bold text-green-500">{CURRENCY_SYMBOL}{settlement.amount.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
