
"use client";

import { useState, useMemo } from 'react';
import type { Settlement, Group, HistoryEvent } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";
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
  groupHistory?: HistoryEvent[];
}

function SettlementDetailContent({ settlement, group, groupHistory = [] }: Omit<SettlementListItemProps, 'currentUserId'>) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const settlementHistory = useMemo(() => {
        // If this settlement was restored from a deleted one, also include history from the original
        const restoreEvent = groupHistory.find(
            e => e.eventType === 'settlement_restored' && e.data?.newSettlementId === settlement.id
        );
        const originalSettlementId = restoreEvent?.data?.originalSettlementId;

        return groupHistory.filter(e => {
            const relevantTypes = ['settlement_updated', 'settlement_deleted', 'settlement_restored'];
            if (!relevantTypes.includes(e.eventType)) return false;
            if (e.data?.settlementId === settlement.id) return true;
            if (e.data?.newSettlementId === settlement.id) return true;
            // Include pre-deletion history of the original settlement
            if (originalSettlementId && e.data?.settlementId === originalSettlementId) return true;
            return false;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [groupHistory, settlement.id]);

    const visibleHistory = showAllHistory ? settlementHistory : settlementHistory.slice(0, 1);
    const lastUpdatedEvent = settlementHistory.length > 0 ? settlementHistory[0] : null;

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
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-muted-foreground text-sm">
                            Recorded on {format(new Date(settlement.date), "MMMM d, yyyy")}
                        </p>
                        {lastUpdatedEvent && (
                            <p className="text-muted-foreground text-xs mt-0.5">
                                Last updated {formatDistanceToNow(new Date(lastUpdatedEvent.timestamp), { addSuffix: true })} by {getFullName(lastUpdatedEvent.actor.firstName, lastUpdatedEvent.actor.lastName)}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
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

                {settlement.notes && (
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                        <p className="text-sm text-foreground italic">"{settlement.notes}"</p>
                    </div>
                )}

                <Separator />

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
                    {settlementHistory.length > 0 ? (
                        <div className="space-y-2">
                            {visibleHistory.map(event => (
                                <div
                                    key={event.id}
                                    className={[
                                        'border-l-4 p-3 rounded-md',
                                        event.eventType === 'settlement_deleted'
                                            ? 'border-l-red-500 bg-red-500/5'
                                            : event.eventType === 'settlement_restored'
                                            ? 'border-l-purple-500 bg-purple-500/5'
                                            : 'border-l-blue-500 bg-blue-500/5',
                                    ].join(' ')}
                                >
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <span className={[
                                            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                            event.eventType === 'settlement_deleted'
                                                ? 'text-red-500 bg-red-500/15'
                                                : event.eventType === 'settlement_restored'
                                                ? 'text-purple-500 bg-purple-500/15'
                                                : 'text-blue-500 bg-blue-500/15',
                                        ].join(' ')}>
                                            {event.eventType === 'settlement_deleted'
                                                ? <><Icons.Delete className="h-3 w-3" /> Deleted</>
                                                : event.eventType === 'settlement_restored'
                                                ? <><Icons.Restore className="h-3 w-3" /> Restored</>
                                                : <><Icons.Edit className="h-3 w-3" /> Updated</>}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        by {getFullName(event.actor.firstName, event.actor.lastName)}
                                    </p>
                                    {event.data?.changes?.length > 0 ? (
                                        <div className="space-y-2">
                                            {event.data.changes.map((change: any, index: number) => (
                                                <div key={index} className="text-xs">
                                                    <span className="font-semibold text-foreground">{change.field}:</span>
                                                    {change.to ? (
                                                        <div className="text-muted-foreground flex items-center gap-2">
                                                            <span className="text-red-500 line-through">{change.from}</span>
                                                            <Icons.ArrowRight className="h-3 w-3 flex-shrink-0" />
                                                            <span className="text-green-500">{change.to}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted-foreground">{change.from}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">{event.description}</p>
                                    )}
                                </div>
                            ))}
                            {settlementHistory.length > 1 && (
                                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowAllHistory(!showAllHistory)}>
                                    {showAllHistory ? 'Show less' : `Show ${settlementHistory.length - 1} more update(s)`}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 border rounded-lg bg-background/30 text-center text-sm text-muted-foreground">
                            <p>No updates recorded for this settlement.</p>
                        </div>
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


export function SettlementListItem({ settlement, currentUserId, group, groupHistory }: SettlementListItemProps) {
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
            <SettlementDetailContent settlement={settlement} group={group} groupHistory={groupHistory} />
        </AccordionContent>
    </AccordionItem>
  );
}
