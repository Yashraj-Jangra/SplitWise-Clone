
'use client';

import { useState, useEffect } from 'react';
import type { Group, Expense } from '@/types';
import { getGroupById } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '../ui/skeleton';
import { ExpenseForm } from './expense-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  group?: Group;
}

export function EditExpenseDialog({ open, onOpenChange, expense, group: initialGroup }: EditExpenseDialogProps) {
    const { userProfile } = useAuth();
    const [group, setGroup] = useState<Group | null>(initialGroup || null);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const isMobile = useIsMobile();
    
    useEffect(() => {
        if (!initialGroup && open) {
            setIsGroupLoading(true);
            async function fetchGroup() {
                const fetchedGroup = await getGroupById(expense.groupId);
                if (fetchedGroup) setGroup(fetchedGroup);
                setIsGroupLoading(false);
            }
            fetchGroup();
        } else if (initialGroup) {
            setGroup(initialGroup);
        }
    }, [initialGroup, expense.groupId, open]);

    if (!userProfile) return null;

    const handleCloseDialog = () => {
        onOpenChange(false);
    }
    
    const FormComponent = (
        <ExpenseForm 
            group={group!} 
            isEditing={true} 
            expenseToEdit={expense} 
            onClose={handleCloseDialog} 
        />
    );

    const isLoading = isGroupLoading || !group;

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                {isLoading ? <Skeleton className="w-full h-full" /> : open && FormComponent}
            </Sheet>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
           {isLoading ? (
                <DialogContent className="p-6">
                    <Skeleton className="h-[500px] w-full" />
                </DialogContent>
           ) : open && FormComponent}
        </Dialog>
    );
}
