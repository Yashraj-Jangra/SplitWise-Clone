
'use client';

import * as React from 'react';
import type { Group, Expense, UserProfile } from '@/types';
import { getGroupById } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '../ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import { ExpenseForm } from './expense-form';

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  group?: Group;
}

export function EditExpenseDialog({ open, onOpenChange, expense, group: initialGroup }: EditExpenseDialogProps) {
    const { userProfile } = useAuth();
    const [group, setGroup] = React.useState<Group | null>(initialGroup || null);
    const [isGroupLoading, setIsGroupLoading] = React.useState(false);
    const isMobile = useIsMobile();
    
    React.useEffect(() => {
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
    
    const handleClose = () => {
        onOpenChange(false);
    };

    const FormComponent = userProfile && group && (
        <ExpenseForm 
          group={group} 
          userProfile={userProfile}
          isEditing={true}
          expenseToEdit={expense}
          onClose={handleClose} 
        />
    );

    const SkeletonLoader = (
        <div className="p-6">
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
    
    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                {isGroupLoading || !group ? SkeletonLoader : FormComponent}
            </Sheet>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {isGroupLoading || !group ? <DialogContent>{SkeletonLoader}</DialogContent> : FormComponent}
        </Dialog>
    );
}

