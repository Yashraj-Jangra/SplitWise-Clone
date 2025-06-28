
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { HistoryEvent } from '@/types';
import { getHistoryByGroupId, restoreExpense, deleteHistoryEvent } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';
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

interface GroupHistoryTabProps {
  groupId: string;
  onActionComplete: () => void;
  onViewExpense: (expenseId: string) => void;
}

const eventIcons: { [key: string]: React.ReactNode } = {
  expense_created: <Icons.Add className="h-4 w-4 text-green-500" />,
  expense_updated: <Icons.Edit className="h-4 w-4 text-blue-500" />,
  expense_deleted: <Icons.Delete className="h-4 w-4 text-red-500" />,
  expense_restored: <Icons.Restore className="h-4 w-4 text-purple-500" />,
  default: <Icons.History className="h-4 w-4 text-muted-foreground" />,
};

function HistoryEventItem({ event, onActionComplete, onViewExpense }: { event: HistoryEvent; onActionComplete: () => void; onViewExpense: (expenseId: string) => void; }) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleRestore = async () => {
        if (!userProfile) return;
        setIsRestoring(true);
        try {
            await restoreExpense(event.id, userProfile.uid);
            toast({ title: "Expense Restored", description: "The expense has been successfully restored."});
            onActionComplete();
        } catch (error) {
            toast({ variant: "destructive", title: "Restore Failed", description: error instanceof Error ? error.message : "Could not restore the expense."});
        } finally {
            setIsRestoring(false);
        }
    };
    
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteHistoryEvent(event.id);
            toast({ title: "History Event Deleted" });
            onActionComplete();
        } catch (error) {
             toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete history event."});
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };
    
    const canRestore = event.eventType === 'expense_deleted' && !event.restored;
    const canDelete = userProfile?.role === 'admin';

    let viewableExpenseId: string | null = null;
    if ((event.eventType === 'expense_created' || event.eventType === 'expense_updated') && event.data?.expenseId) {
        viewableExpenseId = event.data.expenseId;
    } else if (event.eventType === 'expense_restored' && event.data?.newExpenseId) {
        viewableExpenseId = event.data.newExpenseId;
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                    {eventIcons[event.eventType] || eventIcons.default}
                </div>
                <div className="flex-1 grid gap-1">
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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
                                <p>Restore Expense</p>
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


export function GroupHistoryTab({ groupId, onActionComplete, onViewExpense }: GroupHistoryTabProps) {
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
  }, [fetchHistory]);
  
  const handleAction = () => {
    fetchHistory();
    onActionComplete();
  }

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
      <CardContent className="p-6 pt-0">
        {history.length > 0 ? (
          <ScrollArea className="h-[45vh] -mx-6 pr-6">
            <div className="divide-y divide-border">
                {history.map(event => (
                    <HistoryEventItem key={event.id} event={event} onActionComplete={handleAction} onViewExpense={onViewExpense} />
                ))}
            </div>
          </ScrollArea>
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
