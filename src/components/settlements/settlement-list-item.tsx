
"use client";

import type { Settlement } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFullName, getInitials } from "@/lib/utils";

interface SettlementListItemProps {
  settlement: Settlement;
  currentUserId: string;
}

export function SettlementListItem({ settlement, currentUserId }: SettlementListItemProps) {
  const { toast } = useToast();
  const isPayer = settlement.paidBy.uid === currentUserId;
  const isPayee = settlement.paidTo.uid === currentUserId;

  let description = "";
  if (isPayer) {
    description = `You paid ${getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}`;
  } else if (isPayee) {
    description = `${getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} paid you`;
  } else {
    description = `${getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} paid ${getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}`;
  }

  const handleDelete = () => {
    // Simulate delete
    toast({ title: "Settlement Deleted", description: `Settlement of ${CURRENCY_SYMBOL}${settlement.amount} has been removed.` });
    // Here you would call an API and update state/refresh
  };

  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
            <Avatar className="h-10 w-10 border-2 border-background rounded-full">
            <AvatarImage src={settlement.paidBy.avatarUrl} alt={getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} />
            <AvatarFallback>{getInitials(settlement.paidBy.firstName, settlement.paidBy.lastName)}</AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10 border-2 border-background rounded-full">
            <AvatarImage src={settlement.paidTo.avatarUrl} alt={getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)} />
            <AvatarFallback>{getInitials(settlement.paidTo.firstName, settlement.paidTo.lastName)}</AvatarFallback>
            </Avatar>
        </div>
        <div className="grid gap-0.5">
          <p className="text-sm font-medium leading-none truncate max-w-[150px] sm:max-w-xs">{description}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(settlement.date), { addSuffix: true })}
          </p>
          {settlement.notes && <p className="text-xs text-muted-foreground italic truncate max-w-[150px] sm:max-w-xs">Note: {settlement.notes}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-green-600">{CURRENCY_SYMBOL}{settlement.amount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Settled</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Icons.MoreHorizontal className="h-4 w-4" />
               <span className="sr-only">Settlement options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Icons.Delete className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
