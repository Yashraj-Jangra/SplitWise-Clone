
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

interface SettlementListItemProps {
  settlement: Settlement;
  currentUserId: string;
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

export function SettlementListItem({ settlement, currentUserId }: SettlementListItemProps) {
  const { toast } = useToast();
  const isPayer = settlement.paidBy.uid === currentUserId;
  const isPayee = settlement.paidTo.uid === currentUserId;

  let description = "";
  if (isPayer) {
    description = `You paid ${settlement.paidTo.name}`;
  } else if (isPayee) {
    description = `${settlement.paidBy.name} paid you`;
  } else {
    description = `${settlement.paidBy.name} paid ${settlement.paidTo.name}`;
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
            <AvatarImage src={settlement.paidBy.avatarUrl} alt={settlement.paidBy.name} />
            <AvatarFallback>{getInitials(settlement.paidBy.name)}</AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10 border-2 border-background rounded-full">
            <AvatarImage src={settlement.paidTo.avatarUrl} alt={settlement.paidTo.name} />
            <AvatarFallback>{getInitials(settlement.paidTo.name)}</AvatarFallback>
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

