
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/types';
import { addExpense } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { expenseSchema, ExpenseForm } from './expense-form';
import { errorEmitter } from '@/firebase/error-emitter';

type AddExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  group: Group;
  onExpenseAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddExpenseDialog({
  group,
  onExpenseAdded,
  trigger,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  const defaultValues = useMemo(() => {
    if (!userProfile) return {};
    return {
      description: '',
      amount: undefined,
      date: new Date(),
      notes: '',
      payerType: 'single' as const,
      singlePayerId: userProfile.uid,
      multiPayers: group.members.map((member) => ({
        userId: member.uid,
        name: `${member.firstName} ${member.lastName || ''}`.trim(),
        amount: undefined,
      })),
      splitType: 'equally' as const,
      participants: group.members.map((member) => ({
        userId: member.uid,
        name: `${member.firstName} ${member.lastName || ''}`.trim(),
        avatarUrl: member.avatarUrl,
        selected: true,
        amountOwed: 0,
        shares: 1,
        percentage: 0,
      })),
      category: 'Other',
    };
  }, [userProfile, group.members]);

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form, defaultValues]);


  async function onSubmit(values: AddExpenseFormValues) {
    if (!userProfile) return;

    let payers: { userId: string; amount: number }[] = [];
    if (values.payerType === 'single' && values.singlePayerId) {
      payers = [{ userId: values.singlePayerId, amount: values.amount }];
    } else {
      payers =
        values.multiPayers
          ?.filter((p) => p.amount && p.amount > 0)
          .map((p) => ({ userId: p.userId, amount: p.amount! })) || [];
    }

    if (payers.length === 0) {
      form.setError('payerType', {
        type: 'manual',
        message: 'At least one payer must be specified.',
      });
      return;
    }

    const finalParticipants = values.participants
      .filter((p) => p.selected)
      .map((p) => ({
        userId: p.userId,
        amountOwed: Number(p.amountOwed) || 0,
        share: Number(p.shares) || 1,
      }));

    if (finalParticipants.length === 0) {
      form.setError('participants', {
        type: 'manual',
        message: 'At least one participant must be selected.',
      });
      return;
    }

    const totalAmount = Number(values.amount);

    const expenseData = {
      groupId: group.id,
      description: values.description,
      amount: totalAmount,
      date: values.date,
      notes: values.notes || '',
      payers,
      participants: finalParticipants,
      splitType: values.splitType,
      category: values.category,
    };

    try {
      await addExpense(expenseData, userProfile.uid);
      toast({
        title: 'Expense Added!',
        description: `"${values.description}" has been successfully added to ${group.name}.`,
      });
      setOpen(false);
      if (onExpenseAdded) onExpenseAdded();
      window.dispatchEvent(new CustomEvent('data-changed'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      errorEmitter.emit('permission-error', {
        message: errorMessage,
        context: {
          path: 'expenses',
          operation: 'create',
          requestResourceData: expenseData,
        },
      });
      toast({
        title: 'Error Adding Expense',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  if (!userProfile) return null;

  const dialogTrigger = trigger || (
    <Button>
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );
  const mobileTrigger = trigger || (
    <Button className="w-full">
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );

  const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider {...form}>
      <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full">
        {children}
      </form>
    </FormProvider>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{mobileTrigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-screen flex flex-col p-0 border-0 bg-background"
        >
          <FormProviderWrapper key={open ? 'open' : 'closed'}>
            <ExpenseForm group={group} closeDialog={() => setOpen(false)} isEditing={false} />
          </FormProviderWrapper>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent className="max-w-none w-auto p-0 border-0 bg-transparent shadow-none">
        <DialogTitle className="sr-only">Add Expense</DialogTitle>
        <FormProviderWrapper key={open ? 'open' : 'closed'}>
          <ExpenseForm group={group} closeDialog={() => setOpen(false)} isEditing={false} />
        </FormProviderWrapper>
      </DialogContent>
    </Dialog>
  );
}
