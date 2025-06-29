
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense, Group } from "@/types";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFullName, getInitials } from '@/lib/utils';
import { deleteExpense } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EditExpenseDialog } from './edit-expense-dialog';


interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  currentUserId: string;
  group?: Group;
  onActionComplete?: () => void;
}

export function ExpenseDetailDialog({ open, onOpenChange, expense, currentUserId, group, onActionComplete }: ExpenseDetailDialogProps) {
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
