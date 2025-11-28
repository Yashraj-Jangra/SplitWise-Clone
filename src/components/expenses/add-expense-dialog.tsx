
'use client';

import { useState, useEffect } from 'react';
import type { Group } from '@/types';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { ExpenseForm } from './expense-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { FormProvider, useForm } from 'react-hook-form';
import * as z from 'zod';

const expenseSchema = z.object({
  // This can be simplified as it's not directly used here, but for context
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

interface AddExpenseDialogProps {
  group: Group;
  trigger?: React.ReactNode;
  onExpenseAdded?: () => void;
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
}

export function AddExpenseDialog({
  group,
  trigger,
  onExpenseAdded,
  buttonVariant,
  buttonSize,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize}>
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );

  const handleCloseDialog = () => {
    setOpen(false);
    if (onExpenseAdded) onExpenseAdded();
  }

  const FormComponent = (
    <ExpenseForm 
      group={group} 
      isEditing={false} 
      onClose={handleCloseDialog} 
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
