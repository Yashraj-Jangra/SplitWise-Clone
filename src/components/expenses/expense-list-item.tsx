
"use client";

import { useState } from 'react';
import type { Expense, Group } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { getFullName, getInitials } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ExpenseDetailDialog } from './expense-detail-dialog';

interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string; // To determine user's involvement
  group?: Group; // Optional: Pass group data to avoid re-fetching in dialog
  onActionComplete?: () => void;
}

export function ExpenseListItem({ expense, currentUserId, group, onActionComplete }: ExpenseListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const currentUserParticipation = expense.participants.find(p => p.user.uid === currentUserId);
  const amountUserOwes = currentUserParticipation ? currentUserParticipation.amountOwed : 0;
  const isPayer = expense.payers.some(p => p.user.uid === currentUserId);
  
  const getPayerText = () => {
    if (expense.payers.length === 1) {
        const payer = expense.payers[0].user;
        return `Paid by ${payer.uid === currentUserId ? 'You' : getFullName(payer.firstName, payer.lastName)}`;
    } else if (expense.payers.length > 1) {
        const otherPayersCount = expense.payers.length - 1;
        const firstPayer = expense.payers[0].user;
        const firstPayerName = firstPayer.uid === currentUserId ? 'You' : getFullName(firstPayer.firstName, firstPayer.lastName);
        return `Paid by ${firstPayerName} & ${otherPayersCount} other${otherPayersCount > 1 ? 's' : ''}`;
    }
    return "Paid by Unknown";
  }

  const renderAvatars = () => {
    const visiblePayers = expense.payers.slice(0, 2);
    const hiddenPayersCount = expense.payers.length - visiblePayers.length;

    return (
        <TooltipProvider>
            <div className="flex -space-x-2">
                {visiblePayers.map(payer => (
                    <Tooltip key={payer.user.uid}>
                        <TooltipTrigger asChild>
                            <Avatar className="h-10 w-10 border-2 border-background">
                                <AvatarImage src={payer.user.avatarUrl} alt={getFullName(payer.user.firstName, payer.user.lastName)} />
                                <AvatarFallback>{getInitials(payer.user.firstName, payer.user.lastName)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{getFullName(payer.user.firstName, payer.user.lastName)} paid {CURRENCY_SYMBOL}{payer.amount.toFixed(2)}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
                {hiddenPayersCount > 0 && (
                    <Tooltip>
                         <TooltipTrigger asChild>
                            <Avatar className="h-10 w-10 border-2 border-background">
                                <AvatarFallback>+{hiddenPayersCount}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>And {hiddenPayersCount} more payer(s)</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    )
  }

  return (
    <>
      <div id={`expense-${expense.id}`} onClick={() => setIsDetailOpen(true)} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
        <div className="flex items-center gap-4">
          {renderAvatars()}
          <div className="grid gap-0.5">
            <p className="text-sm font-medium leading-none truncate max-w-[150px] sm:max-w-xs">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              {getPayerText()} • {formatDistanceToNow(new Date(expense.date), { addSuffix: true })}
            </p>
            {expense.category && <Badge variant="outline" className="w-fit text-xs">{expense.category}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
            {currentUserParticipation && !isPayer && (
              <p className="text-xs text-red-600">You owe: {CURRENCY_SYMBOL}{amountUserOwes.toFixed(2)}</p>
            )}
            {isPayer && currentUserParticipation && currentUserParticipation.amountOwed < expense.payers.find(p => p.user.uid === currentUserId)!.amount && (
              <p className="text-xs text-green-600">You get back: {CURRENCY_SYMBOL}{(expense.payers.find(p => p.user.uid === currentUserId)!.amount - amountUserOwes).toFixed(2)}</p>
            )}
          </div>
           {/* Dropdown menu is now a secondary action, details are primary */}
        </div>
      </div>
      
      <ExpenseDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        expense={expense}
        group={group}
        currentUserId={currentUserId}
        onActionComplete={onActionComplete}
      />
    </>
  );
}
