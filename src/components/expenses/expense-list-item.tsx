
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EditExpenseDialog } from './edit-expense-dialog';
import { getFullName, getInitials } from '@/lib/utils';
import { deleteExpense } from '@/lib/mock-data';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string; // To determine user's involvement
  group?: Group; // Optional: Pass group data to avoid re-fetching in dialog
  onActionComplete?: () => void;
}

export function ExpenseListItem({ expense, currentUserId, group, onActionComplete }: ExpenseListItemProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await deleteExpense(expense.id, expense.groupId, expense.amount, currentUserId);
        toast({ title: "Expense Deleted", description: `"${expense.description}" has been removed.` });
        setIsDeleteDialogOpen(false);
        if (onActionComplete) {
            onActionComplete();
        } else {
            router.refresh();
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error Deleting Expense",
            description: "Failed to delete the expense. Please try again.",
        });
    } finally {
        setIsDeleting(false);
    }
  };

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
      <div id={`expense-${expense.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50">
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
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
            {currentUserParticipation && !isPayer && (
              <p className="text-xs text-red-600">You owe: {CURRENCY_SYMBOL}{amountUserOwes.toFixed(2)}</p>
            )}
            {isPayer && currentUserParticipation && currentUserParticipation.amountOwed < expense.amount && (
              <p className="text-xs text-green-600">You get back: {CURRENCY_SYMBOL}{(expense.payers.find(p => p.user.uid === currentUserId)!.amount - amountUserOwes).toFixed(2)}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Icons.MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Expense options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                <Icons.Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <Icons.Delete className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense "{expense.description}" and recalculate group balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
              Delete Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EditExpenseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={expense}
        group={group}
        onActionComplete={onActionComplete}
      />
    </>
  );
}
