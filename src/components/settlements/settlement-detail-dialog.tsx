
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Settlement, Group } from "@/types";
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
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFullName, getInitials } from '@/lib/utils';
import { deleteSettlement } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';
import { EditSettlementDialog } from './edit-settlement-dialog';
import { useAuth } from '@/contexts/auth-context';

interface SettlementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: Settlement;
  group?: Group;
  onActionComplete?: () => void;
}

export function SettlementDetailDialog({ open, onOpenChange, settlement, group, onActionComplete }: SettlementDetailDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { userProfile } = useAuth();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!userProfile) return;
        setIsDeleting(true);
        try {
            await deleteSettlement(settlement.id, settlement.groupId, userProfile.uid);
            toast({ title: "Settlement Deleted", description: `The settlement has been removed.` });
            setIsDeleteDialogOpen(false);
            onOpenChange(false);
            if (onActionComplete) onActionComplete();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error Deleting Settlement",
                description: "Failed to delete the settlement. Please try again.",
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="pr-10">
                        <DialogTitle className="text-2xl font-headline">Settlement Details</DialogTitle>
                         <DialogDescription>
                            {format(new Date(settlement.date), "eeee, MMMM d, yyyy")}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={settlement.paidBy.avatarUrl} alt={getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} />
                                    <AvatarFallback>{getInitials(settlement.paidBy.firstName, settlement.paidBy.lastName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs text-muted-foreground">From</p>
                                    <p className="font-medium">{getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)}</p>
                                </div>
                            </div>
                            
                             <Icons.ArrowRight className="h-6 w-6 text-primary flex-shrink-0" />
                            
                            <div className="flex items-center gap-3">
                               <Avatar className="h-10 w-10">
                                    <AvatarImage src={settlement.paidTo.avatarUrl} alt={getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)} />
                                    <AvatarFallback>{getInitials(settlement.paidTo.firstName, settlement.paidTo.lastName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs text-muted-foreground">To</p>
                                    <p className="font-medium">{getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="text-4xl font-bold text-green-500">{CURRENCY_SYMBOL}{settlement.amount.toFixed(2)}</p>
                        </div>
                       
                        {settlement.notes && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                                    <p className="text-sm text-foreground italic">"{settlement.notes}"</p>
                                </div>
                            </>
                        )}
                    </div>
                    
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
                    This action cannot be undone. This will permanently delete this settlement and recalculate group balances.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Settlement
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Edit Settlement Dialog - only rendered when needed */}
            {isEditDialogOpen && (
                <EditSettlementDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    settlement={settlement}
                    group={group}
                    onActionComplete={handleActionComplete}
                />
            )}
        </>
    );
}
