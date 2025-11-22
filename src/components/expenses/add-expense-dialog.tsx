
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetFooter } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/types';
import { addExpense } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { expenseSchema, ExpenseForm } from './expense-form';
import { appEventEmitter } from '@/lib/event-emitter';

type AddExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  group: Group;
  trigger?: React.ReactNode;
}

export function AddExpenseDialog({
  group,
  trigger,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
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
  }, [userProfile, group]);

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
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
      appEventEmitter.emit('data-changed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      
      toast({
        title: 'Error Adding Expense',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }
  
  const dialogTrigger = trigger || (
    <Button>
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );

  const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider {...form}>
      <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-full flex flex-col p-0 border-0 bg-background"
        >
          <FormProviderWrapper>
            <ExpenseForm group={group} isEditing={false} />
            <SheetFooter className="p-4 border-t mt-auto">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" form="add-expense-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </SheetFooter>
          </FormProviderWrapper>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Add a new expense to the group "{group.name}".
          </DialogDescription>
        </DialogHeader>
        <FormProviderWrapper>
            <div className="max-h-[60vh] overflow-y-auto p-1 -mx-4 px-4">
                <ExpenseForm group={group} isEditing={false} />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" form="add-expense-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
        </FormProviderWrapper>
      </DialogContent>
    </Dialog>
  );
}
