

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense, Group, HistoryEvent } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { getFullName, getInitials, cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Icons } from '@/components/icons';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '../ui/button';
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
import { useToast } from "@/hooks/use-toast";
import { deleteExpense } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';
import { EditExpenseDialog } from './edit-expense-dialog';


interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string;
  group?: Group;
  groupHistory: HistoryEvent[];
  onActionComplete?: () => void;
}

function ExpenseDetailContent({ expense, currentUserId, group, onActionComplete }: Omit<ExpenseListItemProps, 'groupHistory'>) {
    const { toast } = useToast();
    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteExpense(expense.id, expense.groupId, expense.amount, currentUserId);
            toast({ title: "Expense Deleted", description: `"${expense.description}" has been removed.` });
            setIsDeleteDialogOpen(false);
            if (onActionComplete) {
                onActionComplete();
            }
            window.dispatchEvent(new CustomEvent('data-changed'));
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
    
    const handleActionComplete = () => {
        setIsEditDialogOpen(false);
        if (onActionComplete) {
            onActionComplete();
        }
    }

    return (
        <>
            <div className="p-4 space-y-4 bg-muted/30">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-muted-foreground text-sm">
                            Added by {getFullName(expense.expenseCreator.firstName, expense.expenseCreator.lastName)} on {format(new Date(expense.date), "MMMM d, yyyy")}
                        </p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                            <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                </div>

                <Separator/>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Paid By & Split For</h3>
                        <div className="space-y-3">
                            {expense.participants.map(p => {
                                const payerInfo = expense.payers.find(payer => payer.user.uid === p.user.uid);
                                return (
                                    <div key={p.user.uid} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={p.user.avatarUrl} alt={getFullName(p.user.firstName, p.user.lastName)} />
                                                <AvatarFallback>{getInitials(p.user.firstName, p.user.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{getFullName(p.user.firstName, p.user.lastName)}</span>
                                        </div>
                                        <div className="text-right">
                                            {payerInfo && <p className="text-xs text-muted-foreground">paid {CURRENCY_SYMBOL}{payerInfo.amount.toFixed(2)}</p>}
                                            <p className="text-sm font-medium text-destructive">owes {CURRENCY_SYMBOL}{p.amountOwed.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    
                    <div>
                        {expense.notes && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                                <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{expense.notes}</p>
                            </div>
                        )}
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Comments</h3>
                        <div className="p-4 border rounded-lg bg-background/50 text-center text-sm text-muted-foreground">
                            <p>Commenting feature coming soon.</p>
                        </div>
                    </div>
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
            
            {isEditDialogOpen && (
                <EditExpenseDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    expense={expense}
                    group={group}
                    onActionComplete={handleActionComplete}
                />
            )}
        </>
    )
}


export function ExpenseListItem({ expense, currentUserId, group, onActionComplete }: Omit<ExpenseListItemProps, 'groupHistory'>) {
  const { settings } = useSiteSettings();

  const currentUserParticipation = expense.participants.find(p => p.user.uid === currentUserId);
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

  const categoryIconName = settings.expenseCategories[expense.masterCategory || 'Uncategorized']?.subCategories[expense.category || 'Other']?.icon || 'Wallet';
  const CategoryIcon = Icons[categoryIconName];

  return (
    <AccordionItem value={`exp-${expense.id}`} className="border-b border-border/50">
        <AccordionTrigger className="p-3 hover:bg-muted/50 transition-colors hover:no-underline [&[data-state=open]]:bg-muted/50">
            <div className="flex items-center gap-4 flex-1">
                <div className="text-center w-12 flex-shrink-0">
                    <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-1">
                        <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'MMM dd')}</p>
                </div>
                <div className="grid gap-0.5 text-left">
                    <p className="text-base font-medium leading-none truncate max-w-[150px] sm:max-w-xs">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-bold text-foreground">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
                {userShare.text && <p className={cn("text-xs font-medium", userShare.className)}>{userShare.text}</p>}
            </div>
        </AccordionTrigger>
        <AccordionContent>
            <ExpenseDetailContent expense={expense} currentUserId={currentUserId} group={group} onActionComplete={onActionComplete} />
        </AccordionContent>
    </AccordionItem>
  );
}

