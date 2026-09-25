

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { HistoryEvent } from '@/types';
import { getHistoryByGroupId, restoreExpense, restoreSettlement, deleteHistoryEvent } from '@/lib/api.client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
import { getFullName } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { appEventEmitter } from '@/lib/event-emitter';

// --- Rewritten History Parsing Logic ---

type ParsedChange =
  | { type: 'changed'; name: string; from: string; to: string }
  | { type: 'added'; name: string; detail: string }
  | { type: 'removed'; name: string; detail: string }
  | { type: 'unknown'; text: string };

function parseComplexChange(text: string): ParsedChange {
    const trimmedText = text.trim();

    // Order is important: more specific regexes first.
    
    // 1. Changed: "changed [NAME]'s [share/payment] from [VALUE] to [VALUE]"
    const changedMatch = trimmedText.match(/changed (.*?)'s (?:share|payment) from (.*?) to (.*?)$/);
    if (changedMatch) {
        const [, name, from, to] = changedMatch;
        return { type: 'changed', name: name.trim(), from: from.trim(), to: to.trim() };
    }
    
    // 2. Added: "added [NAME] who paid [VALUE]" OR "added [NAME] to split (owes [VALUE])"
    const addedPaidMatch = trimmedText.match(/added (.*?) who paid (.*?)$/);
    if (addedPaidMatch) {
        const [, name, amount] = addedPaidMatch;
        return { type: 'added', name: name.trim(), detail: `paid ${amount.trim()}` };
    }
    const addedOwesMatch = trimmedText.match(/added (.*?) to split \(owes (.*?)\)$/);
    if (addedOwesMatch) {
        const [, name, amount] = addedOwesMatch;
        return { type: 'added', name: name.trim(), detail: `owes ${amount.trim()}` };
    }

    // 3. Removed: "removed [NAME] (who paid [VALUE])" OR "removed [NAME] from split (was owing [VALUE])"
    const removedPaidMatch = trimmedText.match(/removed (.*?) \(who paid (.*?)\)$/);
    if (removedPaidMatch) {
        const [, name, amount] = removedPaidMatch;
        return { type: 'removed', name: name.trim(), detail: `paid ${amount.trim()}` };
    }
    const removedOwesMatch = trimmedText.match(/removed (.*?) from split \(was owing (.*?)\)$/);
    if (removedOwesMatch) {
        const [, name, amount] = removedOwesMatch;
        return { type: 'removed', name: name.trim(), detail: `was owing ${amount.trim()}` };
    }
    
    // Fallback for any format that doesn't match
    return { type: 'unknown', text: trimmedText };
}


const ComplexChangeDetail = ({ change }: { change: ParsedChange }) => {
    switch (change.type) {
        case 'changed':
            return (
                <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                    <span className="font-semibold text-foreground/80">{change.name}:</span>
                    <span className="text-red-500 line-through">{change.from}</span>
                    <Icons.ArrowRight className="h-3 w-3 flex-shrink-0" />
                    <span className="text-green-500">{change.to}</span>
                </div>
            );
        case 'added':
            return (
                 <div className="flex items-center gap-2 text-green-500">
                    <Icons.UserPlus className="h-3 w-3 flex-shrink-0" />
                    <span>Added <span className="font-semibold">{change.name}</span> ({change.detail})</span>
                </div>
            );
        case 'removed':
            return (
                 <div className="flex items-center gap-2 text-red-500">
                    <Icons.UserMinus className="h-3 w-3 flex-shrink-0" />
                    <span>Removed <span className="font-semibold">{change.name}</span> ({change.detail})</span>
                </div>
            );
        default: // 'unknown'
            return (
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Icons.ArrowRight className="h-3 w-3 flex-shrink-0"/>
                    <span>{change.text}</span>
                </div>
            );
    }
};

// --- End of new logic ---


interface GroupHistoryTabProps {
  groupId: string;
  onViewExpense: (expenseId: string) => void;
}

const eventIcons: { [key: string]: React.ReactNode } = {
  // Creations
  expense_created: <Icons.Add className="h-4 w-4 text-green-500" />,
  settlement_created: <Icons.Settle className="h-4 w-4 text-green-500" />,
  group_created: <Icons.Add className="h-4 w-4 text-green-500" />,
  member_added: <Icons.UserPlus className="h-4 w-4 text-green-500" />,
  // Updates
  expense_updated: <Icons.Edit className="h-4 w-4 text-blue-500" />,
  settlement_updated: <Icons.Edit className="h-4 w-4 text-blue-500" />,
  group_updated: <Icons.Edit className="h-4 w-4 text-blue-500" />,
  budget_updated: <Icons.Wallet className="h-4 w-4 text-emerald-500" />,
  // Deletions
  expense_deleted: <Icons.Delete className="h-4 w-4 text-red-500" />,
  settlement_deleted: <Icons.Delete className="h-4 w-4 text-red-500" />,
  member_removed: <Icons.UserMinus className="h-4 w-4 text-red-500" />,
  // Restorations
  expense_restored: <Icons.Restore className="h-4 w-4 text-purple-500" />,
  settlement_restored: <Icons.Restore className="h-4 w-4 text-purple-500" />,
  // Default
  default: <Icons.History className="h-4 w-4 text-muted-foreground" />,
};


function HistoryEventItem({ event, onViewExpense, isDeleted }: { event: HistoryEvent; onViewExpense: (expenseId: string) => void; isDeleted?: boolean; }) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const expenseDate = useMemo(() => {
        // Only show expense date for expense-related events
        if (event.data?.date && event.eventType.startsWith('expense_')) {
            const dateValue = event.data.date;
            // The date from event data may have a .toDate() method or ISO string
            if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                return dateValue.toDate();
            }
            // It might also be an ISO string if processed elsewhere
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        return null;
    }, [event.data, event.eventType]);

    const handleRestore = async () => {
        if (!userProfile) return;
        setIsRestoring(true);
        try {
            if (event.eventType === 'expense_deleted') {
                await restoreExpense(event.id, userProfile.uid);
                toast({ title: "Expense Restored", description: "The expense has been successfully restored."});
            } else if (event.eventType === 'settlement_deleted') {
                await restoreSettlement(event.id, userProfile.uid);
                toast({ title: "Settlement Restored", description: "The settlement has been successfully restored."});
            }
            appEventEmitter.emit('data-changed');
        } catch (error) {
            toast({ variant: "destructive", title: "Restore Failed", description: error instanceof Error ? error.message : "Could not restore the item."});
        } finally {
            setIsRestoring(false);
        }
    };
    
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteHistoryEvent(event.id);
            toast({ title: "History Event Deleted" });
            appEventEmitter.emit('data-changed');
        } catch (error) {
             toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete history event."});
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };
    
    const canRestore = (event.eventType === 'expense_deleted' || event.eventType === 'settlement_deleted') && !event.restored;
    const canDelete = userProfile?.role === 'admin';
    const isAiBudget = event.eventType === 'budget_updated' && Boolean(event.data?.aiInitiated);
    const currentEventIcon = isAiBudget
      ? <Icons.Bot className="h-4 w-4 text-purple-500" />
      : (eventIcons[event.eventType] || eventIcons.default);

    const isUpdateWithDetails =
      (event.eventType === 'expense_updated' ||
       event.eventType === 'group_updated' ||
       event.eventType === 'settlement_updated' ||
       event.eventType === 'budget_updated') &&
      event.data?.changes &&
      event.data.changes.length > 0;

    let viewableExpenseId: string | null = null;
    if ((event.eventType === 'expense_created' || event.eventType === 'expense_updated') && event.data?.expenseId) {
        viewableExpenseId = event.data.expenseId;
    } else if (event.eventType === 'expense_restored' && event.data?.newExpenseId) {
        viewableExpenseId = event.data.newExpenseId;
    }
    
    if (isDeleted) {
        viewableExpenseId = null;
    }

    return (
        <TooltipProvider>
            <div className="p-3 hover:bg-muted/50 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        {currentEventIcon}
                    </div>
                    <div className="flex-1 grid gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-sm font-medium", isDeleted && "line-through text-muted-foreground/80")}>
                                {event.description}
                                {expenseDate && (
                                    <span className="text-muted-foreground text-xs ml-2 font-normal">
                                        (for {format(expenseDate, 'MMM d')})
                                    </span>
                                )}
                            </p>
                            {isAiBudget && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs">
                                    <Icons.Bot className="w-2.5 h-2.5" />
                                    <span>SplitIt AI</span>
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            <span className="ml-1">
                                ({format(new Date(event.timestamp), "MMM d, h:mm a")})
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {viewableExpenseId && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewExpense(viewableExpenseId!)}>
                                        <Icons.ArrowRight className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View Expense</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {canRestore && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRestore} disabled={isRestoring}>
                                        {isRestoring ? <Icons.AppLogo className="h-4 w-4 animate-spin"/> : <Icons.Restore className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Restore {event.eventType === 'expense_deleted' ? 'Expense' : 'Settlement'}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
                                        <Icons.Delete className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete History Event</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                 </div>

                {isUpdateWithDetails && (
                    <Accordion type="single" collapsible className="w-full mt-1">
                        <AccordionItem value="item-1" className="border-b-0">
                            <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline justify-start gap-1 p-0 h-auto font-normal [&[data-state=open]>svg]:rotate-180 cursor-pointer">
                                <span>Show details ({event.data.changes.length} change{event.data.changes.length > 1 ? 's' : ''})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pl-6 text-xs">
                                {/* Green callout when total monthly budget remained unchanged */}
                                {event.eventType === 'budget_updated' && event.data?.monthlyBudgetUnchanged && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl mb-3">
                                        <Icons.Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                                        <span>Total monthly budget was not changed (₹{(event.data?.currentMonthlyLimit || 0).toLocaleString('en-IN')})</span>
                                    </div>
                                )}

                                {/* Amber callout if group budget was turned off */}
                                {event.eventType === 'budget_updated' && event.data?.newStatus === 'disabled' && (
                                    <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl mb-3">
                                        <Icons.AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                                        <span>Group budget tracking has been disabled.</span>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    {event.data.changes.map((change: any, index: number) => {
                                        if (change.type === 'added') {
                                            return (
                                                <div key={index} className="flex items-center gap-2 text-emerald-500 font-medium">
                                                    <Icons.Add className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Added <span className="font-semibold text-foreground/90">{change.field}:</span> {change.to}</span>
                                                </div>
                                            );
                                        }
                                        if (change.type === 'removed') {
                                            return (
                                                <div key={index} className="flex items-center gap-2 text-red-500 font-medium">
                                                    <Icons.Delete className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Removed <span className="font-semibold text-foreground/90">{change.field}:</span> was {change.from}</span>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={index}>
                                                <span className="font-semibold text-foreground/90">{change.field}:</span>{' '}
                                                {(change.field === 'Payers' || change.field === 'Split') && change.from ? (
                                                    <div className="space-y-1.5 mt-1 pl-2 border-l-2 ml-1">
                                                        {change.from.split('; ').filter((s: string) => s.trim()).map((item: string, i: number) => (
                                                            <ComplexChangeDetail key={i} change={parseComplexChange(item)} />
                                                        ))}
                                                    </div>
                                                ) : change.to ? (
                                                    <span className="text-muted-foreground inline-flex items-center gap-1.5 ml-1 flex-wrap">
                                                        <span className="text-red-500 line-through">{change.from}</span>
                                                        <Icons.ArrowRight className="h-3 w-3 flex-shrink-0 inline" />
                                                        <span className="text-emerald-500 font-semibold">{change.to}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground ml-1">{change.from}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete History Event?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is for admin use only. This action is permanent and will remove this event from the audit trail. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                           {isDeleting ? "Deleting..." : "Confirm Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}


export function GroupHistoryTab({ groupId, onViewExpense }: GroupHistoryTabProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
        const historyEvents = await getHistoryByGroupId(groupId);
        setHistory(historyEvents);
    } catch (error) {
        console.error("Failed to fetch group history:", error);
        toast({
            variant: "destructive",
            title: "Failed to load history",
            description: "Could not fetch the activity log for this group."
        })
    } finally {
        setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    fetchHistory();
    appEventEmitter.on('data-changed', fetchHistory);
    return () => {
      appEventEmitter.off('data-changed', fetchHistory);
    };
  }, [fetchHistory]);

  const deletedExpenseIds = useMemo(() => {
    const deletedIds = new Set<string>();
    history.forEach(event => {
      if (event.eventType === 'expense_deleted' && event.data?.expenseId && !event.restored) {
        deletedIds.add(event.data.expenseId);
      }
    });
    return deletedIds;
  }, [history]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group History</CardTitle>
          <CardDescription>Loading activity log...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <Icons.History className="h-5 w-5 mr-2 text-primary" />
            Group History
        </CardTitle>
        <CardDescription>An audit log of all activities within this group.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {history.length > 0 ? (
          <div className="divide-y divide-border">
              {history.map(event => {
                  const isDeleted = (event.eventType === 'expense_created' || event.eventType === 'expense_updated') && event.data?.expenseId && deletedExpenseIds.has(event.data.expenseId);
                  return (<HistoryEventItem key={event.id} event={event} onViewExpense={onViewExpense} isDeleted={isDeleted} />)
              })}
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <Icons.History className="h-12 w-12 mx-auto mb-2" />
            No history recorded yet for this group.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
