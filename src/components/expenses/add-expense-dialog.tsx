
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Group, Expense, UserProfile } from '@/types';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn, getFullName, getInitials } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { getMasterCategory } from '@/lib/expense-categories';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addExpense } from '@/lib/mock-data';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';

// UI Components
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PayerView, SplitView } from './expense-form';
import { appEventEmitter } from '@/lib/event-emitter';

// Icons
import { X, ArrowLeft } from 'lucide-react';


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
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

function MainExpenseForm({ setView }: { setView: (view: 'main' | 'split' | 'payer') => void }) {
  const { control, watch } = useFormContext<ExpenseFormValues>();
  const { userProfile } = useAuth();
  const { settings } = useSiteSettings();
  const { getValues } = useFormContext();
  const group = getValues('group');

  const watchAmount = watch('amount');
  const watchPayerType = watch('payerType');
  const watchSinglePayerId = watch('singlePayerId');
  const watchMultiPayers = watch('multiPayers');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
  const watchCategory = watch('category');

  const { CategoryIcon } = React.useMemo(() => {
    if (!settings.expenseCategories) return { CategoryIcon: Icons.Wallet };
    const masterCategory = getMasterCategory(watchCategory, settings.expenseCategories);
    if (!masterCategory || !settings.expenseCategories[masterCategory]?.subCategories?.[watchCategory]) {
      return { CategoryIcon: Icons.Wallet };
    }
    const iconName = settings.expenseCategories[masterCategory].subCategories[watchCategory].icon || 'Wallet';
    return { CategoryIcon: Icons[iconName] || Icons.Wallet };
  }, [watchCategory, settings.expenseCategories]);

  const selectedParticipants = watchParticipants?.filter((p: any) => p.selected) || [];

  const handleParticipantSelection = (userId: string, isSelected: boolean) => {
    const updatedParticipants = watchParticipants.map((p: any) =>
      p.userId === userId ? { ...p, selected: isSelected } : p
    );
    control.setValue('participants', updatedParticipants, { shouldValidate: true });
  };

  const getSummaryText = () => {
    if (!userProfile || !watchAmount || isNaN(Number(watchAmount))) return 'Enter an amount to see your share.';
    const userPaid = watchPayerType === 'single'
      ? (watchSinglePayerId === userProfile.uid ? watchAmount : 0)
      : watchMultiPayers?.find((p: any) => p.userId === userProfile.uid)?.amount || 0;
      
    const userOwed = watchParticipants?.find((p: any) => p.userId === userProfile.uid)?.amountOwed || 0;
    
    // Ensure both values are numbers before calculating
    const net = (Number(userPaid) || 0) - (Number(userOwed) || 0);

    if (isNaN(net)) {
        return 'Calculating...';
    }
    if (Math.abs(net) < 0.01) return 'You are all square.';
    if (net > 0) return `You get back ${CURRENCY_SYMBOL}${net.toFixed(2)}`;
    return `You owe ${CURRENCY_SYMBOL}${Math.abs(net).toFixed(2)}`;
  };

  const paidByText = React.useMemo(() => {
    if (watchPayerType === 'single') {
        const payer = group.members.find((m: UserProfile) => m.uid === watchSinglePayerId);
        if (payer?.uid === userProfile?.uid) return 'you';
        return payer ? getFullName(payer.firstName, payer.lastName) : '...';
    }
    const payers = watchMultiPayers?.filter((p: any) => p.amount > 0) || [];
    if (payers.length === 0) return 'no one';
    if (payers.length === 1) {
        const payer = group.members.find((m: UserProfile) => m.uid === payers[0].userId);
        if (payer?.uid === userProfile?.uid) return 'you';
        return payer ? getFullName(payer.firstName, payer.lastName) : '...';
    }
    return `multiple people`;
  }, [watchPayerType, watchSinglePayerId, watchMultiPayers, group.members, userProfile?.uid]);

  const splitText = watchSplitType.replace('_', ' ');

  return (
    <div className="space-y-4">
      <DialogHeader className="mb-4">
        <DialogTitle>Add an expense</DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-4">
          <FormField
            control={control}
            name="category"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="ghost" role="combobox" className="h-auto p-0 flex flex-col items-center gap-1">
                        <div className="flex-shrink-0 p-4 bg-muted rounded-lg">
                          <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">{field.value}</span>
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                          <CommandGroup key={masterCat} heading={masterCat}>
                            {details && details.subCategories && Object.keys(details.subCategories).map((subCat) => {
                              const subDetails = details.subCategories[subCat];
                              const Icon = subDetails?.icon ? (Icons as any)[subDetails.icon] : Icons.Wallet;
                              return (
                                <CommandItem
                                  value={subCat}
                                  key={subCat}
                                  onSelect={() => {
                                    field.onChange(subCat);
                                  }}
                                >
                                  <Icon className={cn("mr-2 h-4 w-4", field.value === subCat ? "opacity-100" : "opacity-40")} />
                                  {subCat}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="w-full">
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Description" {...field} className="text-lg font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b transition-all duration-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative flex items-baseline">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {CURRENCY_SYMBOL}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          className="pl-2 text-4xl font-bold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b h-auto transition-all duration-200"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm">Paid by <Button variant="link" className="p-0 h-auto" onClick={() => setView('payer')}>{paidByText}</Button> and split <Button variant="link" className="p-0 h-auto" onClick={() => setView('split')}>{splitText}</Button>.</p>
        <p className="text-xs text-muted-foreground">({getSummaryText()})</p>
      </div>
       <div className="flex items-start gap-2">
            <p className="text-sm pt-1.5 flex-shrink-0">With:</p>
            <div className="flex-1 flex flex-wrap items-center gap-1">
                {selectedParticipants.map((p: any) => (
                    <Badge key={p.userId} variant="secondary" className="pl-2 pr-1">
                        {p.name}
                        <button type="button" onClick={() => handleParticipantSelection(p.userId, false)} className="ml-1 rounded-full hover:bg-destructive/50">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setView('split')} className="flex-shrink-0">Edit</Button>
        </div>


      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <Icons.Calendar className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
                 <Popover>
                    <PopoverTrigger asChild>
                         <FormControl>
                            <Button type="button" variant="outline" className="w-full justify-start font-normal">
                                <Icons.Edit className="mr-2 h-4 w-4" />
                                {field.value ? "Edit notes" : "Add notes"}
                            </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                         <div className="space-y-2">
                            <h4 className="font-medium leading-none">Notes</h4>
                            <p className="text-sm text-muted-foreground">Add any extra details about the expense.</p>
                            <Textarea {...field} rows={4} />
                         </div>
                    </PopoverContent>
                 </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

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
  const [view, setView] = React.useState<'main' | 'split' | 'payer'>('main');
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
        description: '',
        amount: undefined,
        date: new Date(),
        notes: '',
        payerType: 'single',
        splitType: 'equally',
        category: 'Other',
    }
  });

  const { reset, watch, setValue, getValues, formState } = form;

  useEffect(() => {
    if (open && userProfile) {
        reset({
            group: group,
            description: '',
            amount: undefined,
            date: new Date(),
            notes: '',
            payerType: 'single',
            singlePayerId: userProfile.uid,
            multiPayers: group.members.map((member) => ({
                userId: member.uid,
                name: `${member.firstName} ${member.lastName || ''}`.trim(),
                amount: undefined,
            })),
            splitType: 'equally',
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
    }
  }, [open, group, userProfile, reset]);
  
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

    // --- Validation Logic ---
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
    // --- End Validation ---

    const payers = values.payerType === 'single' && values.singlePayerId
      ? [{ userId: values.singlePayerId, amount: values.amount }]
      : values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];

    const finalParticipants = values.participants
      .filter(p => p.selected)
      .map(p => ({ userId: p.userId, amountOwed: Number(p.amountOwed) || 0, share: Number(p.shares) || 1 }));

    try {
        await addExpense({
            groupId: group.id,
            description: values.description,
            amount: totalAmount,
            date: values.date,
            notes: values.notes || '',
            payers,
            participants: finalParticipants,
            splitType: values.splitType,
            category: values.category,
        }, userProfile.uid);
        toast({ title: 'Expense Added!', description: `"${values.description}" has been successfully added to ${group.name}.` });
        if(onExpenseAdded) onExpenseAdded();
        appEventEmitter.emit('data-changed');
        setOpen(false);
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "An unknown error occurred.", variant: 'destructive' });
    }
  }


  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize}>
      <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
    </Button>
  );

  const handleCloseDialog = () => {
    setOpen(false);
  }

  const FormUI = (
      <div className="flex flex-nowrap w-full">
        <div className="flex-shrink-0 w-full sm:w-[480px]">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                  <MainExpenseForm setView={setView} />
              </form>
            </ScrollArea>
            <DialogFooter className="p-6 pt-0">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" form="add-expense-form" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Saving...' : 'Save Expense'}
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
  
  if (isMobile) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-center text-lg font-semibold">New Expense</SheetTitle>
                </SheetHeader>
                <FormProvider {...form}>
                  <ScrollArea className="flex-1">
                      <form id="add-expense-form-mobile" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="p-6">
                          {view === 'split' ? <SplitView setView={setView} /> : view === 'payer' ? <PayerView setView={setView} /> : <MainExpenseForm setView={setView} />}
                        </div>
                      </form>
                  </ScrollArea>
                  {view === 'main' && (
                      <SheetFooter className="p-4 bg-background/50 border-t">
                          <Button form="add-expense-form-mobile" type="submit" disabled={formState.isSubmitting} className="w-full" size="lg">
                              {formState.isSubmitting ? 'Saving...' : 'Save Expense'}
                          </Button>
                      </SheetFooter>
                  )}
                </FormProvider>
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
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
