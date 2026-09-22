
'use client';

import * as React from 'react';
import type { Group, Expense, UserProfile } from '@/types';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExpenseForm } from './expense-form';

interface AddExpenseDialogProps {
  group: Group;
  trigger?: React.ReactNode;
  onExpenseAdded?: () => void;
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseDialog({
  group,
  trigger,
  onExpenseAdded,
  buttonVariant,
  buttonSize,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddExpenseDialogProps) {
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen;
  const isMobile = useIsMobile();
  const { userProfile } = useAuth();
  
  const handleClose = () => {
    setOpen(false);
    if (onExpenseAdded) {
      onExpenseAdded();
    }
  };

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize}>
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );

  const FormComponent = userProfile && (
    <ExpenseForm 
      group={group} 
      userProfile={userProfile}
      isEditing={false}
      onClose={handleClose} 
    />
  );
  
  if (isMobile) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>
            {open && FormComponent}
        </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      {open && FormComponent}
    </Dialog>
  );
}
