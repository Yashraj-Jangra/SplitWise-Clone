
"use client";

import { useState } from 'react';
import type { Expense, Group, HistoryEvent } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { getFullName, getInitials } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ExpenseDetailDialog } from './expense-detail-dialog';

interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string;
  group?: Group;
  groupHistory: HistoryEvent[];
  onActionComplete?: () => void;
}

export function ExpenseListItem({ expense, currentUserId, group, groupHistory, onActionComplete }: ExpenseListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const currentUserParticipation = expense.participants.find(p => p.user.uid === currentUserId);
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
            <div className="flex -space-x-3">
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
  
  const userShare = {
    amount: 0,
    text: "",
    className: ""
  };

  if (currentUserParticipation) {
    const userPaidAmount = expense.payers.find(p => p.user.uid === currentUserId)?.amount || 0;
    const netAmount = userPaidAmount - currentUserParticipation.amountOwed;
    userShare.amount = netAmount;

    if (netAmount > 0.01) {
        userShare.text = `You get back ${CURRENCY_SYMBOL}${netAmount.toFixed(2)}`;
        userShare.className = "text-green-500";
    } else if (netAmount < -0.01) {
        userShare.text = `You owe ${CURRENCY_SYMBOL}${Math.abs(netAmount).toFixed(2)}`;
        userShare.className = "text-red-500";
    }
  }

  return (
    <>
      <div id={`expense-${expense.id}`} onClick={() => setIsDetailOpen(true)} className="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:scale-[1.01] hover:shadow-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center w-12 text-xs text-muted-foreground">
             <div className="font-bold text-lg text-foreground">{format(new Date(expense.date), 'dd')}</div>
             <div>{format(new Date(expense.date), 'MMM')}</div>
          </div>
          <div className="grid gap-0.5">
            <p className="text-base font-medium leading-none truncate max-w-[150px] sm:max-w-xs">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              {getPayerText()}
            </p>
          </div>
        </div>
        <div className="text-right">
            <p className="text-base font-bold text-foreground">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
            {userShare.text && <p className={`text-xs font-medium ${userShare.className}`}>{userShare.text}</p>}
        </div>
      </div>
      
      <ExpenseDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        expense={expense}
        group={group}
        currentUserId={currentUserId}
        onActionComplete={onActionComplete}
        groupHistory={groupHistory}
      />
    </>
  );
}
