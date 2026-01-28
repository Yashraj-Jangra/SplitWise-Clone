
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
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                    </Button>
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
                    <Icons.Settle className="h-7 w-7 text-green-500 mx-auto"/>
                </div>
                <div className="grid gap-1 text-left">
                    <div className="flex items-center gap-2 text-sm font-medium">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={settlement.paidBy.avatarUrl} alt={getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)} />
                        <AvatarFallback>{getInitials(settlement.paidBy.firstName, settlement.paidBy.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[80px]">{isPayer ? 'You' : getFullName(settlement.paidBy.firstName, settlement.paidBy.lastName)}</span>
                    <Icons.ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={settlement.paidTo.avatarUrl} alt={getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)} />
                        <AvatarFallback>{getInitials(settlement.paidTo.firstName, settlement.paidTo.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[80px]">{isPayee ? 'you' : getFullName(settlement.paidTo.firstName, settlement.paidTo.lastName)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                       <span>{format(new Date(settlement.date), "PPP")}</span>
                    </div>
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
