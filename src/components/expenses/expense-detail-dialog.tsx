
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense, Group, HistoryEvent } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFullName, getInitials } from '@/lib/utils';
import { deleteExpense } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EditExpenseDialog } from './edit-expense-dialog';
import { Skeleton } from '../ui/skeleton';
import { Timestamp } from 'firebase/firestore';


interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  currentUserId: string;
  group?: Group;
  groupHistory: HistoryEvent[];
  onActionComplete?: () => void;
}

const eventIcons: { [key: string]: React.ReactNode } = {
  expense_created: <Icons.Add className="h-4 w-4 text-green-500" />,
  expense_updated: <Icons.Edit className="h-4 w-4 text-blue-500" />,
  expense_deleted: <Icons.Delete className="h-4 w-4 text-red-500" />,
  expense_restored: <Icons.Restore className="h-4 w-4 text-purple-500" />,
  default: <Icons.History className="h-4 w-4 text-muted-foreground" />,
};


export function ExpenseDetailDialog({ open, onOpenChange, expense, currentUserId, group, groupHistory, onActionComplete }: ExpenseDetailDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const expenseHistory = useMemo(() => {
        if (!groupHistory) return [];

        // Find if this expense is a result of a restore operation
        const restoreEvent = groupHistory.find(e => e.eventType === 'expense_restored' && e.data?.newExpenseId === expense.id);
        const originalExpenseId = restoreEvent?.data?.originalExpenseId;
        
        const relevantIds = new Set([expense.id]);
        if (originalExpenseId) {
            relevantIds.add(originalExpenseId);
        }

        const filtered = groupHistory.filter(event => {
            const eventExpenseId = event.data?.expenseId;
            // Event is related to the current expense OR its original incarnation
            if (eventExpenseId && relevantIds.has(eventExpenseId)) {
                return true;
            }
            // Also include the restore event itself which links them
            if (restoreEvent && event.id === restoreEvent.id) {
                return true;
            }
            return false;
        });
        
        // The group history is already sorted, but filtering can change order, so re-sort.
        return filtered.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

     }, [groupHistory, expense.id]);

    const historyLoading = !groupHistory;


    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteExpense(expense.id, expense.groupId, expense.amount, currentUserId);
            toast({ title: "Expense Deleted", description: `"${expense.description}" has been removed.` });
            setIsDeleteDialogOpen(false);
            onOpenChange(false); // Close the detail view as well
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
    
    const handleActionComplete = () => {
        setIsEditDialogOpen(false);
        onOpenChange(false);
        if (onActionComplete) {
            onActionComplete();
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                    <DialogHeader className="pr-10">
                        <div className="flex items-start justify-between">
                            <DialogTitle className="text-2xl font-headline">{expense.description}</DialogTitle>
                            <Badge variant="secondary" className="text-lg">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</Badge>
                        </div>
                        <DialogDescription>
                            {format(new Date(expense.date), "eeee, MMMM d, yyyy")} • Category: {expense.category || 'N/A'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 -mx-6">
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Paid By</h3>
                                <div className="space-y-3">
                                    {expense.payers.map(payer => (
                                        <div key={payer.user.uid} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={payer.user.avatarUrl} alt={getFullName(payer.user.firstName, payer.user.lastName)} />
                                                    <AvatarFallback>{getInitials(payer.user.firstName, payer.user.lastName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{getFullName(payer.user.firstName, payer.user.lastName)}</span>
                                            </div>
                                            <span className="font-semibold">{CURRENCY_SYMBOL}{payer.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Split For</h3>
                                <div className="space-y-3">
                                    {expense.participants.map(p => (
                                        <div key={p.user.uid} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={p.user.avatarUrl} alt={getFullName(p.user.firstName, p.user.lastName)} />
                                                    <AvatarFallback>{getInitials(p.user.firstName, p.user.lastName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{getFullName(p.user.firstName, p.user.lastName)}</span>
                                            </div>
                                            <span className="text-muted-foreground">owes {CURRENCY_SYMBOL}{p.amountOwed.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             <Separator />

                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="history" className="border-b-0">
                                <AccordionTrigger>
                                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                                    <Icons.History className="mr-2 h-4 w-4" /> Expense History
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {historyLoading ? (
                                        <div className="space-y-3 pt-2">
                                            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                                        </div>
                                    ) : expenseHistory.length > 0 ? (
                                        <ScrollArea className="h-40">
                                            <div className="space-y-3 pt-2 pr-4">
                                                {expenseHistory.map(event => {
                                                    const expenseDate = (() => {
                                                        if (event.data?.date && event.eventType.startsWith('expense_')) {
                                                            const dateValue = event.data.date;
                                                            if (dateValue instanceof Timestamp) {
                                                                return dateValue.toDate();
                                                            }
                                                            const parsedDate = new Date(dateValue);
                                                            if (!isNaN(parsedDate.getTime())) {
                                                                return parsedDate;
                                                            }
                                                        }
                                                        return null;
                                                    })();

                                                    return (
                                                        <div key={event.id} className="flex items-center gap-3 text-xs">
                                                            <div className="flex-shrink-0">
                                                                {eventIcons[event.eventType] || eventIcons.default}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-muted-foreground">
                                                                    {event.description}
                                                                    {expenseDate && (
                                                                        <span className="text-muted-foreground text-xs ml-2 font-normal">
                                                                            (for {format(expenseDate, 'MMM d')})
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-muted-foreground/80">
                                                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                                                    <span className="ml-1">
                                                                        ({format(new Date(event.timestamp), "MMM d, h:mm a")})
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        <p className="text-xs text-muted-foreground text-center pt-4">No history found for this expense.</p>
                                    )}
                                </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
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
            
            {/* Edit Expense Dialog - only rendered when needed */}
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
    );
}
