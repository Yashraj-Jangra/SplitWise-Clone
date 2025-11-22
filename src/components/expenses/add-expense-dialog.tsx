
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/types';
import { addExpense } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { ExpenseForm, PayerView, SplitView } from './expense-form';
import { appEventEmitter } from '@/lib/event-emitter';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required.').max(100),
  amount: z.coerce.number({ invalid_type_error: "Amount is required." }).positive('Amount must be positive.'),
  date: z.date({ required_error: 'Date is required.' }),
  notes: z.string().max(200, 'Notes must be 200 characters or less.').optional(),
  payerType: z.enum(['single', 'multiple']).default('single'),
  singlePayerId: z.string().optional(),
  multiPayers: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      amount: z.coerce.number().optional(),
    })
  ).optional(),
  splitType: z.enum(['equally', 'unequally', 'by_shares', 'by_percentage']),
  participants: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      avatarUrl: z.string().optional(),
      selected: z.boolean(),
      amountOwed: z.coerce.number().optional(),
      shares: z.coerce.number().min(0, 'Shares cannot be negative').optional(),
      percentage: z.coerce.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100').optional(),
    })
  ).min(1, 'At least one participant is required.').refine((arr) => arr.some((p) => p.selected), {
    message: 'At least one participant must be selected.',
    path: ['-'],
  }),
  category: z.string({ required_error: 'Category is required.' }),
});

type AddExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  group: Group;
  trigger?: React.ReactNode;
  onExpenseAdded?: () => void;
}

export function AddExpenseDialog({
  group,
  trigger,
  onExpenseAdded,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'split' | 'payer'>('main');
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  const { watch, setValue, getValues, reset } = form;
  
  const watchSplitType = watch('splitType');
  const watchAmount = watch('amount');
  
  useEffect(() => {
    if (open && userProfile) {
      reset({
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
      });
      setView('main');
    }
  }, [open, userProfile, group.members, reset]);

  const calculateSplits = useCallback(() => {
    const totalAmount = Number(getValues('amount')) || 0;
    const allParticipants = getValues('participants') || [];
    const selectedParticipants = allParticipants.filter((p: any) => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
        allParticipants.forEach((_: any, index: number) => {
             setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
        });
        return;
    }
    
    let amounts: number[] = [];

    if (watchSplitType === 'equally') {
        amounts = Array(numSelected).fill(totalAmount / numSelected);
    } else if (watchSplitType === 'by_shares') {
        const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
        if (totalShares > 0) {
            amounts = selectedParticipants.map((p: any) => (totalAmount * (Number(p.shares) || 1)) / totalShares);
        }
    } else if (watchSplitType === 'by_percentage') {
        amounts = selectedParticipants.map((p: any) => (totalAmount * (Number(p.percentage) || 0)) / 100);
    } else {
        return;
    }

    if (amounts.length > 0) {
        const roundedAmounts = amounts.map(a => parseFloat(a.toFixed(2)));
        let remainder = parseFloat((totalAmount - roundedAmounts.reduce((s, a) => s + a, 0)).toFixed(2));
        
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
            roundedAmounts[i % numSelected] += 0.01 * Math.sign(remainder);
        }

        allParticipants.forEach((p: any, index: number) => {
            const selectedIndex = selectedParticipants.findIndex((sp: any) => sp.userId === p.userId);
            if (selectedIndex !== -1) {
                setValue(`participants.${index}.amountOwed`, roundedAmounts[selectedIndex], { shouldValidate: true });
            } else {
                setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
            }
        });
    }
  }, [watchSplitType, setValue, getValues]);

  useEffect(() => {
    calculateSplits();
  }, [calculateSplits, watchAmount, watchSplitType]);


  async function onSubmit(values: AddExpenseFormValues) {
    if (!userProfile) return;

    const totalAmount = Number(values.amount);

    if (values.payerType === 'multiple') {
        const totalPaid = values.multiPayers?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
        if (Math.abs(totalPaid - totalAmount) > 0.01) {
            form.setError('multiPayers', { type: 'manual', message: `The total paid amount (${totalPaid.toFixed(2)}) must equal the expense amount (${totalAmount.toFixed(2)}).` });
            return;
        }
    }
    
    if (values.splitType === 'unequally') {
        const totalOwed = values.participants.filter(p => p.selected).reduce((acc, p) => acc + (p.amountOwed || 0), 0);
        if (Math.abs(totalOwed - totalAmount) > 0.01) {
            form.setError('participants', { type: 'manual', message: `The sum of owed amounts (${totalOwed.toFixed(2)}) must equal the total expense amount (${totalAmount.toFixed(2)}).` });
            return;
        }
    }
    
    if (values.splitType === 'by_percentage') {
        const totalPercentage = values.participants.filter(p => p.selected).reduce((acc, p) => acc + (p.percentage || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            form.setError('participants', { type: 'manual', message: `The sum of percentages (${totalPercentage}%) must equal 100%.` });
            return;
        }
    }

    let payers: { userId: string; amount: number }[] = [];
    if (values.payerType === 'single' && values.singlePayerId) {
      payers = [{ userId: values.singlePayerId, amount: values.amount }];
    } else {
      payers =
        values.multiPayers
          ?.filter((p) => p.amount && p.amount > 0)
          .map((p) => ({ userId: p.userId, amount: p.amount! })) || [];
    }

    const finalParticipants = values.participants
      .filter((p) => p.selected)
      .map((p) => ({
        userId: p.userId,
        amountOwed: Number(p.amountOwed) || 0,
        share: Number(p.shares) || 1,
      }));

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
  
  const formId = "add-expense-form";

  const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider {...form}>
        {children}
    </FormProvider>
  );

  const viewContent = (
    <FormProviderWrapper>
      {view === 'split' ? (
        <SplitView setView={setView} />
      ) : view === 'payer' ? (
        <PayerView setView={setView} group={group} />
      ) : (
        <ExpenseForm group={group} isEditing={false} setView={setView} />
      )}
    </FormProviderWrapper>
  );
  

  if (isMobile) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                 <FormProviderWrapper>
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="text-center text-lg font-semibold">New Expense</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="flex-1">
                        <div className="p-6">{viewContent}</div>
                    </ScrollArea>
                    {view === 'main' && (
                        <SheetFooter className="p-4 bg-background/50 border-t">
                            <Button form={formId} onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting} className="w-full" size="lg">
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
                            </Button>
                        </SheetFooter>
                    )}
                 </FormProviderWrapper>
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent 
        className={cn(
            "sm:max-w-md p-0 overflow-hidden grid transition-all duration-300 gap-0",
            view !== 'main' ? "sm:max-w-4xl grid-cols-2" : "sm:max-w-md grid-cols-1"
        )}
        onInteractOutside={(e) => {
            if (view !== 'main') {
                e.preventDefault();
                setView('main');
            }
        }}
    >
        <FormProviderWrapper>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                <ExpenseForm
                    group={group}
                    isEditing={false}
                    setView={setView}
                />
                 {view === 'main' && (
                    <DialogFooter className="pt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
                        </Button>
                    </DialogFooter>
                )}
            </form>
            <AnimatePresence>
                {view !== 'main' && (
                     <motion.div
                        key={view}
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-muted/50 h-full border-l p-6"
                    >
                         <ScrollArea className="h-full pr-4 -mr-4">
                            {view === 'split' && <SplitView setView={setView} />}
                            {view === 'payer' && <PayerView setView={setView} group={group} />}
                         </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </FormProviderWrapper>
      </DialogContent>
    </Dialog>
  );
}
