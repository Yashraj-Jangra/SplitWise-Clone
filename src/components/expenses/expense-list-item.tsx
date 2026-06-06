
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Expense, Group, HistoryEvent } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGroupCurrencySymbol } from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";
import { getFullName, getInitials, cn } from '@/lib/utils';
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
import { appEventEmitter } from '@/lib/event-emitter';
import { useHaptics } from '@/hooks/use-haptics';
import { useLongPress } from '@/hooks/use-long-press';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


// --- Rewritten History Parsing Logic ---
type ParsedChange =
  | { type: 'changed'; name: string; from: string; to: string }
  | { type: 'added'; name: string; detail: string }
  | { type: 'removed'; name: string; detail: string }
  | { type: 'unknown'; text: string };

function parseComplexChange(text: string): ParsedChange[] {
  const changes: ParsedChange[] = [];
  if (!text || typeof text !== 'string') return changes;

  const parts = text.split(';').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    // 1. Changed: "changed [NAME]'s [share/payment] from [VALUE] to [VALUE]"
    const changedMatch = part.match(/changed (.*?)'s (?:share|payment) from (.*?) to (.*?)$/);
    if (changedMatch) {
      changes.push({ type: 'changed', name: changedMatch[1].trim(), from: changedMatch[2].trim(), to: changedMatch[3].trim() });
      continue;
    }

    // 2. Added: "added [NAME] who paid [VALUE]" OR "added [NAME] to split (owes [VALUE])"
    const addedPaidMatch = part.match(/added (.*?) who paid (.*?)$/);
    if (addedPaidMatch) {
      changes.push({ type: 'added', name: addedPaidMatch[1].trim(), detail: `paid ${addedPaidMatch[2].trim()}` });
      continue;
    }
    const addedOwesMatch = part.match(/added (.*?) to split \(owes (.*?)\)$/);
    if (addedOwesMatch) {
      changes.push({ type: 'added', name: addedOwesMatch[1].trim(), detail: `owes ${addedOwesMatch[2].trim()}` });
      continue;
    }

    // 3. Removed: "removed [NAME] (who paid [VALUE])" OR "removed [NAME] from split (was owing [VALUE])"
    const removedPaidMatch = part.match(/removed (.*?) \(who paid (.*?)\)$/);
    if (removedPaidMatch) {
      changes.push({ type: 'removed', name: removedPaidMatch[1].trim(), detail: `paid ${removedPaidMatch[2].trim()}` });
      continue;
    }
    const removedOwesMatch = part.match(/removed (.*?) from split \(was owing (.*?)\)$/);
    if (removedOwesMatch) {
      changes.push({ type: 'removed', name: removedOwesMatch[1].trim(), detail: `was owing ${removedOwesMatch[2].trim()}` });
      continue;
    }

    // Fallback for any format that doesn't match
    changes.push({ type: 'unknown', text: part });
  }

  return changes;
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


interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string;
  group?: Group;
  groupHistory: HistoryEvent[];
}

function ExpenseDetailContent({ expense, currentUserId, group, groupHistory }: Omit<ExpenseListItemProps, ''>) {
    const { toast } = useToast();
    const haptic = useHaptics();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const expenseHistory = useMemo(() => {
        // If this expense was restored from a deleted one, also include history from the original
        const restoreEvent = groupHistory.find(
            e => e.eventType === 'expense_restored' && e.data?.newExpenseId === expense.id
        );
        const originalExpenseId = restoreEvent?.data?.originalExpenseId;

        return groupHistory.filter(e => {
            const relevantTypes = ['expense_updated', 'expense_deleted', 'expense_restored'];
            if (!relevantTypes.includes(e.eventType)) return false;
            if (e.data?.expenseId === expense.id) return true;
            if (e.data?.newExpenseId === expense.id) return true;
            // Include pre-deletion history of the original expense
            if (originalExpenseId && e.data?.expenseId === originalExpenseId) return true;
            return false;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [groupHistory, expense.id]);

    const visibleHistory = showAllHistory ? expenseHistory : expenseHistory.slice(0, 1);
    const lastUpdatedEvent = expenseHistory.length > 0 ? expenseHistory[0] : null;

    const handleDelete = async () => {
        haptic.warning();
        setIsDeleting(true);
        try {
            await deleteExpense(expense.id, expense.groupId, expense.amount, currentUserId);
            haptic.success();
            toast({ title: "Expense Deleted", description: `"${expense.description}" has been removed.` });
            setIsDeleteDialogOpen(false);
            appEventEmitter.emit('data-changed');
        } catch (error) {
            haptic.error();
            toast({
                variant: "destructive",
                title: "Error Deleting Expense",
                description: "Failed to delete the expense. Please try again.",
            });
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
                            Added by {getFullName(expense.expenseCreator.firstName, expense.expenseCreator.lastName)} on {format(new Date(expense.date), "MMMM d, yyyy")}
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

                <Separator/>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Financial Split</h3>
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
                                            {payerInfo && <p className="text-xs text-green-500">paid {getGroupCurrencySymbol(group)}{payerInfo.amount.toFixed(2)}</p>}
                                            <p className="text-sm font-medium text-foreground">owes {getGroupCurrencySymbol(group)}{p.amountOwed.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                           {expense.receiptImageUrl ? (
                               <div>
                                   <h3 className="text-sm font-semibold text-muted-foreground mb-2">Receipt</h3>
                                   <a href={expense.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity">
                                       <img src={expense.receiptImageUrl} alt="Receipt" className="w-full object-cover max-h-40" />
                                   </a>
                               </div>
                           ) : (
                               <div className="space-y-2">
                                   <h3 className="text-sm font-semibold text-muted-foreground">Split Info</h3>
                                   <div className="rounded-lg border bg-background/30 px-3 py-2.5 flex items-center gap-3">
                                       <Icons.Expense className="h-4 w-4 text-muted-foreground shrink-0" />
                                       <div>
                                           <p className="text-xs text-muted-foreground">Split method</p>
                                           <p className="text-sm font-medium capitalize">{expense.splitType.replace(/_/g, ' ')}</p>
                                       </div>
                                   </div>
                                   <div className="rounded-lg border bg-background/30 px-3 py-2.5 flex items-center gap-3">
                                       <Icons.Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                       <div>
                                           <p className="text-xs text-muted-foreground">Paid by</p>
                                           <p className="text-sm font-medium">{expense.payers.map(p => getFullName(p.user.firstName, p.user.lastName)).join(', ')}</p>
                                       </div>
                                   </div>
                               </div>
                           )}
                        </div>
                        {expense.notes && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                                <p className="text-sm text-foreground bg-background/30 p-3 rounded-md whitespace-pre-wrap">{expense.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
                    {expenseHistory.length > 0 ? (
                        <div className="space-y-2">
                        {visibleHistory.map(event => (
                            <div
                                            key={event.id}
                                            className={[
                                                'border-l-4 p-3 rounded-md',
                                                event.eventType === 'expense_deleted'
                                                    ? 'border-l-red-500 bg-red-500/5'
                                                    : event.eventType === 'expense_restored'
                                                    ? 'border-l-purple-500 bg-purple-500/5'
                                                    : 'border-l-blue-500 bg-blue-500/5',
                                            ].join(' ')}
                                        >
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <span className={[
                                                    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                                    event.eventType === 'expense_deleted'
                                                        ? 'text-red-500 bg-red-500/15'
                                                        : event.eventType === 'expense_restored'
                                                        ? 'text-purple-500 bg-purple-500/15'
                                                        : 'text-blue-500 bg-blue-500/15',
                                                ].join(' ')}>
                                                    {event.eventType === 'expense_deleted'
                                                        ? <><Icons.Delete className="h-3 w-3" /> Deleted</>
                                                        : event.eventType === 'expense_restored'
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
                                                    {event.data.changes.map((change: any, index: number) => {
                                                        const isComplex = (change.field === 'Payers' || change.field === 'Split') && change.from;
                                                        const parsedComplexChanges = isComplex ? parseComplexChange(change.from) : [];
                                                        return (
                                                            <div key={index} className="text-xs">
                                                                <span className="font-semibold text-foreground">{change.field}:</span>
                                                                {isComplex ? (
                                                                    <div className="space-y-1.5 mt-1 pl-2 border-l-2 ml-1">
                                                                        {parsedComplexChanges.map((parsedChange, i) => (
                                                                            <ComplexChangeDetail key={i} change={parsedChange} />
                                                                        ))}
                                                                    </div>
                                                                ) : change.to ? (
                                                                    <div className="text-muted-foreground flex items-center gap-2">
                                                                        <span className="text-red-500 line-through">{change.from}</span>
                                                                        <Icons.ArrowRight className="h-3 w-3 flex-shrink-0" />
                                                                        <span className="text-green-500">{change.to}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-muted-foreground">{change.from}</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">{event.description}</p>
                                            )}
                                        </div>
                        ))}
                        {expenseHistory.length > 1 && (
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowAllHistory(!showAllHistory)}>
                                {showAllHistory ? 'Show less' : `Show ${expenseHistory.length - 1} more update(s)`}
                            </Button>
                        )}
                        </div>
                    ) : (
                        <div className="p-4 border rounded-lg bg-background/30 text-center text-sm text-muted-foreground">
                            <p>No updates recorded for this expense.</p>
                        </div>
                    )}
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
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
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
                />
            )}
        </>
    )
}


export function ExpenseListItem({ expense, currentUserId, group, groupHistory }: ExpenseListItemProps) {
  const { settings } = useSiteSettings();
  const haptic = useHaptics();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isEditDialogOpenFromMenu, setIsEditDialogOpenFromMenu] = useState(false);
  const [isDeleteDialogOpenFromMenu, setIsDeleteDialogOpenFromMenu] = useState(false);

  const currentUserParticipation = expense.participants.find(p => p.user.uid === currentUserId);
  const currentUserPaidAmount = expense.payers.find(p => p.user.uid === currentUserId)?.amount || 0;
  const userShare = {
    amount: 0,
    text: "",
    className: ""
  };

  // Compute net whether or not the user is in the participants list.
  // A user can be a payer but not in the split (they lent money but owe nothing).
  const userAmountOwed = currentUserParticipation?.amountOwed ?? 0;
  const netAmount = currentUserPaidAmount - userAmountOwed;

  if (currentUserParticipation || currentUserPaidAmount > 0) {
    userShare.amount = netAmount;

    if (netAmount > 0.01) {
        userShare.text = `You lent ${getGroupCurrencySymbol(group)}${netAmount.toFixed(2)}`;
        userShare.className = "text-green-500";
    } else if (netAmount < -0.01) {
        userShare.text = `You owe ${getGroupCurrencySymbol(group)}${Math.abs(netAmount).toFixed(2)}`;
        userShare.className = "text-red-500";
    }
  }

  const categoryIconName = settings.expenseCategories[expense.masterCategory || 'Uncategorized']?.subCategories[expense.category || 'Other']?.icon || 'Wallet';
  const CategoryIcon = Icons[categoryIconName];
  const canEdit = !group?.archivedAt;

  const longPress = useLongPress({
    onLongPress: useCallback(() => {
      if (!canEdit) return;
      haptic.medium();
      setIsQuickMenuOpen(true);
    }, [canEdit, haptic]),
  });

  const handleAccordionTriggerClick = () => {
    haptic.light();
  };

  const handleQuickDelete = async () => {
    haptic.warning();
    try {
      await deleteExpense(expense.id, expense.groupId, expense.amount, currentUserId);
      haptic.success();
      appEventEmitter.emit('data-changed');
    } catch {
      haptic.error();
    }
  };

  return (
    <>
      <AccordionItem value={`exp-${expense.id}`} className="border-b border-border/50">
          <AccordionTrigger
            className="p-3 hover:bg-muted/50 active:bg-muted/70 transition-colors hover:no-underline [&[data-state=open]]:bg-muted/50 select-none"
            onClick={handleAccordionTriggerClick}
            {...longPress.handlers}
          >
              <div className="flex items-center gap-4 flex-1">
                  <div className="text-center w-12 flex-shrink-0">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-1 transition-transform duration-150 active:scale-90">
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
                  <p className="text-base font-bold text-foreground">{getGroupCurrencySymbol(group)}{expense.amount.toFixed(2)}</p>
                  {userShare.text && <p className={cn("text-xs font-medium", userShare.className)}>{userShare.text}</p>}
              </div>
          </AccordionTrigger>
          <AccordionContent>
              <ExpenseDetailContent expense={expense} currentUserId={currentUserId} group={group} groupHistory={groupHistory} />
          </AccordionContent>
      </AccordionItem>

      {/* Long-press quick-action menu */}
      {canEdit && (
        <DropdownMenu open={isQuickMenuOpen} onOpenChange={setIsQuickMenuOpen}>
          <DropdownMenuTrigger className="hidden" />
          <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={e => e.preventDefault()}>
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold truncate">{expense.description}</p>
              <p className="text-xs text-muted-foreground">{getGroupCurrencySymbol(group)}{expense.amount.toFixed(2)}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { haptic.light(); setIsEditDialogOpenFromMenu(true); setIsQuickMenuOpen(false); }}
              className="gap-2"
            >
              <Icons.Edit className="h-4 w-4" /> Edit Expense
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setIsDeleteDialogOpenFromMenu(true); setIsQuickMenuOpen(false); }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Icons.Delete className="h-4 w-4" /> Delete Expense
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isEditDialogOpenFromMenu && (
        <EditExpenseDialog
          open={isEditDialogOpenFromMenu}
          onOpenChange={setIsEditDialogOpenFromMenu}
          expense={expense}
          group={group}
        />
      )}

      <AlertDialog open={isDeleteDialogOpenFromMenu} onOpenChange={setIsDeleteDialogOpenFromMenu}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{expense.description}" and recalculate group balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
