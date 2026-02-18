
"use client";

import { useState } from 'react';
import type { Settlement, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { getFullName, getInitials } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { deleteSettlement } from '@/lib/mock-data';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { EditSettlementDialog } from './edit-settlement-dialog';
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
import { useAuth } from '@/contexts/auth-context';
import { appEventEmitter } from '@/lib/event-emitter';

interface SettlementListItemProps {
  settlement: Settlement;
  currentUserId: string;
  group?: Group;
}

function SettlementDetailContent({ settlement, group }: Omit<SettlementListItemProps, 'currentUserId'>) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!userProfile) return;
        setIsDeleting(true);
        try {
            await deleteSettlement(settlement.id, settlement.groupId, userProfile.uid);
            toast({ title: "Settlement Deleted" });
            setIsDeleteDialogOpen(false);
            appEventEmitter.emit('data-changed');
        } catch (error) {
            toast({ variant: "destructive", title: "Error Deleting Settlement", description: "Failed to delete the settlement." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="p-4 space-y-4 bg-muted/30">
                 {settlement.notes && (
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                        <p className="text-sm text-foreground italic">"{settlement.notes}"</p>
                    </div>
                )}
                 <div className="flex justify-end gap-2">
                    {(!group || !group.archivedAt) && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                                <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                                <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this settlement.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
                            {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />} Delete Settlement
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {isEditDialogOpen && (
                <EditSettlementDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    settlement={settlement}
                    group={group}
                />
            )}
        </>
    );
}


export function SettlementListItem({ settlement, currentUserId, group }: SettlementListItemProps) {
  const isPayer = settlement.paidBy.uid === currentUserId;
  const isPayee = settlement.paidTo.uid === currentUserId;

  return (
    <AccordionItem value={`set-${settlement.id}`} className="border-b border-border/50">
        <AccordionTrigger className="p-3 hover:bg-muted/50 transition-colors hover:no-underline [&[data-state=open]]:bg-muted/50">
            <div className="flex items-center gap-4 flex-1">
                <div className="text-center w-12 flex-shrink-0">
                    <div className="bg-green-500/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-1">
                        <Icons.Settle className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(settlement.date), 'MMM dd')}</p>
                </div>
                <div className="grid gap-0.5 text-left">
                    <div className="flex items-center gap-2 text-base font-medium leading-none">
                        <span>{isPayer ? 'You' : getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)}</span>
                        <Icons.ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{isPayee ? 'you' : getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Settlement</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-bold text-green-500">{CURRENCY_SYMBOL}{settlement.amount.toFixed(2)}</p>
            </div>
        </AccordionTrigger>
        <AccordionContent>
            <SettlementDetailContent settlement={settlement} group={group} />
        </AccordionContent>
    </AccordionItem>
  );
}
