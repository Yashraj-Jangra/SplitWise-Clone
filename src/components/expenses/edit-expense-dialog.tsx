
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Group, Expense, UserProfile } from '@/types';
import { getGroupById } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '../ui/skeleton';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { appEventEmitter } from '@/lib/event-emitter';
import { useToast } from "@/hooks/use-toast";
import { updateExpense } from '@/lib/mock-data';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { PayerView, SplitView, MainExpenseForm } from './expense-form'; // Assuming these are exported
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { AnimatePresence, motion } from 'framer-motion';
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
      percentage: z.coerce.number().min(0, 'Percentage cannot exceed 100').optional(),
    })
  ).min(1, 'At least one participant is required.').refine((arr) => arr.some((p) => p.selected), {
    message: 'At least one participant must be selected.',
    path: ['-'],
  }),
  category: z.string({ required_error: 'Category is required.' }),
  group: z.any(), // To hold the group data
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;


interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  group?: Group;
}

export function EditExpenseDialog({ open, onOpenChange, expense, group: initialGroup }: EditExpenseDialogProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [group, setGroup] = useState<Group | null>(initialGroup || null);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const isMobile = useIsMobile();
    const [view, setView] = useState<'main' | 'split' | 'payer'>('main');

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
    });
    
    const { reset, watch, setValue, getValues, formState } = form;

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
    
    useEffect(() => {
        if (expense && group) {
            const participantData = group.members.map((member) => {
                const existingParticipant = expense.participants.find((p) => p.user.uid === member.uid);
                return {
                    userId: member.uid,
                    name: `${member.firstName} ${member.lastName || ''}`.trim(),
                    avatarUrl: member.avatarUrl,
                    selected: !!existingParticipant,
                    amountOwed: existingParticipant?.amountOwed || 0,
                    shares: existingParticipant?.share || 1,
                    percentage: 0,
                };
            });

            if (expense.splitType === 'by_percentage') {
                const totalAmount = expense.amount;
                if (totalAmount > 0) {
                    participantData.forEach((p) => {
                        if (p.selected) {
                            p.percentage = parseFloat(((p.amountOwed / totalAmount) * 100).toFixed(2));
                        }
                    });
                }
            }
            reset({
                group: group,
                description: expense.description,
                amount: expense.amount,
                date: new Date(expense.date),
                notes: expense.notes || '',
                payerType: expense.payers.length > 1 ? 'multiple' : 'single',
                singlePayerId: expense.payers.length === 1 ? expense.payers[0].user.uid : userProfile?.uid,
                multiPayers: group.members.map((member) => ({
                    userId: member.uid,
                    name: `${member.firstName} ${member.lastName || ''}`.trim(),
                    amount: expense.payers.find((p) => p.user.uid === member.uid)?.amount,
                })),
                splitType: expense.splitType,
                participants: participantData,
                category: expense.category || 'Other',
            });
        }
    }, [expense, group, userProfile, reset]);
    
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

        if (getValues('splitType') === 'equally') {
            amounts = Array(numSelected).fill(totalAmount / numSelected);
        } else if (getValues('splitType') === 'by_shares') {
            const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
            if (totalShares > 0) {
                amounts = selectedParticipants.map((p: any) => (totalAmount * (Number(p.shares) || 1)) / totalShares);
            }
        } else if (getValues('splitType') === 'by_percentage') {
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
            
            let roundedIndex = 0;
            allParticipants.forEach((p: any, index: number) => {
                if (p.selected) {
                    setValue(`participants.${index}.amountOwed`, roundedAmounts[roundedIndex], { shouldValidate: true });
                    roundedIndex++;
                } else {
                    setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
                }
            });
        }
    }, [getValues, setValue]);

    const watchAmount = watch('amount');
    const watchSplitType = watch('splitType');

    useEffect(() => {
        calculateSplits();
    }, [watchAmount, watchSplitType, calculateSplits]);


    async function onSubmit(values: ExpenseFormValues) {
        if (!userProfile) return;
    
        const totalAmount = Number(values.amount);
        // Validation logic here...
    
        const payers = values.payerType === 'single' && values.singlePayerId
          ? [{ userId: values.singlePayerId, amount: values.amount }]
          : values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];
    
        const finalParticipants = values.participants
          .filter(p => p.selected)
          .map(p => ({ userId: p.userId, amountOwed: Number(p.amountOwed) || 0, share: Number(p.shares) || 1 }));
    
        try {
            await updateExpense(expense.id, expense.amount, {
                groupId: group!.id,
                description: values.description,
                amount: totalAmount,
                date: values.date,
                notes: values.notes || '',
                payers,
                participants: finalParticipants,
                splitType: values.splitType,
                category: values.category,
                expenseCreatorId: expense.expenseCreatorId,
                createdAt: expense.createdAt,
            }, userProfile.uid);
            toast({ title: 'Expense Updated!', description: `"${values.description}" has been successfully updated.` });
            appEventEmitter.emit('data-changed');
            onOpenChange(false);
        } catch (error) {
            toast({ title: 'Error', description: error instanceof Error ? error.message : "An unknown error occurred.", variant: 'destructive' });
        }
    }

    const FormUI = (
      <div className="flex flex-nowrap w-full">
        <div className="flex-shrink-0 w-full sm:w-[480px]">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <form id="edit-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                  <MainExpenseForm setView={setView} />
              </form>
            </ScrollArea>
            <DialogFooter className="p-6 pt-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" form="edit-expense-form" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </div>

        <AnimatePresence>
            {view !== 'main' && (
                <motion.div
                    key={view}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: isMobile ? '100%' : 420, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="bg-muted/50 overflow-hidden flex flex-col border-l"
                >
                    <div className="w-[420px]">
                        <ScrollArea className="h-full">
                            <div className="p-6 h-full">
                                {view === 'split' && <SplitView setView={setView} />}
                                {view === 'payer' && <PayerView setView={setView} />}
                            </div>
                        </ScrollArea>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
    
    if (isGroupLoading || !group) {
        const Content = <DialogContent className="p-6"><Skeleton className="h-[500px] w-full" /></DialogContent>;
        if (isMobile) {
            return <Sheet open={open} onOpenChange={onOpenChange}>{Content}</Sheet>
        }
        return <Dialog open={open} onOpenChange={onOpenChange}>{Content}</Dialog>
    }

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                 <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="text-center text-lg font-semibold">Edit Expense</SheetTitle>
                    </SheetHeader>
                    <FormProvider {...form}>
                      <ScrollArea className="flex-1">
                          <form id="edit-expense-form-mobile" onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="p-6">
                              {view === 'split' ? <SplitView setView={setView} /> : view === 'payer' ? <PayerView setView={setView} /> : <MainExpenseForm setView={setView} />}
                            </div>
                          </form>
                      </ScrollArea>
                      {view === 'main' && (
                          <SheetFooter className="p-4 bg-background/50 border-t">
                              <Button form="edit-expense-form-mobile" type="submit" disabled={formState.isSubmitting} className="w-full" size="lg">
                                  {formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                              </Button>
                          </SheetFooter>
                      )}
                    </FormProvider>
                </SheetContent>
            </Sheet>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
           <DialogContent
                className={cn(
                    "p-0 gap-0 transition-all duration-300",
                    view !== 'main' ? "sm:max-w-4xl" : "sm:max-w-md"
                )}
                onInteractOutside={(e) => {
                    if (view !== 'main') {
                        e.preventDefault();
                    }
                }}
            >
                <FormProvider {...form}>
                {FormUI}
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
