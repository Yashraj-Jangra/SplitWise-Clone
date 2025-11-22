
'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons, IconName } from '@/components/icons';
import type { Group } from '@/types';
import { cn, getFullName, getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { classifyExpense, getMasterCategory } from '@/lib/expense-categories';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { useAuth } from '@/contexts/auth-context';
import { Textarea } from '../ui/textarea';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

// --- Form Schema ---
export const expenseSchema = z
  .object({
    description: z.string().min(1, 'Description is required.').max(100),
    amount: z.coerce.number().positive('Amount must be positive.'),
    date: z.date({ required_error: 'Date is required.' }),
    notes: z.string().max(200, 'Notes must be 200 characters or less.').optional(),
    payerType: z.enum(['single', 'multiple']).default('single'),
    singlePayerId: z.string().optional(),
    multiPayers: z
      .array(
        z.object({
          userId: z.string(),
          name: z.string(),
          amount: z.coerce.number().optional(),
        })
      )
      .optional(),
    splitType: z.enum(['equally', 'unequally', 'by_shares', 'by_percentage']),
    participants: z
      .array(
        z.object({
          userId: z.string(),
          name: z.string(),
          avatarUrl: z.string().optional(),
          selected: z.boolean(),
          amountOwed: z.coerce.number().optional(),
          shares: z.coerce.number().min(0, 'Shares cannot be negative').optional(),
          percentage: z
            .coerce
            .number()
            .min(0, 'Percentage cannot be negative')
            .max(100, 'Percentage cannot exceed 100')
            .optional(),
        })
      )
      .min(1, 'At least one participant is required.')
      .refine((arr) => arr.some((p) => p.selected), {
        message: 'At least one participant must be selected.',
      }),
    category: z.string({ required_error: 'Category is required.' }),
  })
  .superRefine((data, ctx) => {
    const totalAmount = Number(data.amount) || 0;

    if (data.payerType === 'single') {
      if (!data.singlePayerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A payer must be selected.',
          path: ['singlePayerId'],
        });
      }
    } else {
      // multiple
      const totalPaid =
        data.multiPayers?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      if (Math.abs(totalPaid - totalAmount) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Payments (${CURRENCY_SYMBOL}${totalPaid.toFixed(
            2
          )}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).`,
          path: ['multiPayers'],
        });
      }
    }

    const finalParticipants = data.participants.filter((p) => p.selected);

    if (data.splitType === 'unequally') {
      const sumOfOwedAmounts = finalParticipants.reduce(
        (sum, p) => sum + (Number(p.amountOwed) || 0),
        0
      );
      if (Math.abs(sumOfOwedAmounts - totalAmount) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Split amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(
            2
          )}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).`,
          path: ['participants'],
        });
      }
    }
    if (data.splitType === 'by_percentage') {
      const sumOfPercentages = finalParticipants.reduce(
        (sum, p) => sum + (Number(p.percentage) || 0),
        0
      );
      if (Math.abs(sumOfPercentages - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Percentages (${sumOfPercentages.toFixed(2)}%) must equal 100%.`,
          path: ['participants'],
        });
      }
    }
  });

interface ExpenseFormProps {
  group: Group;
  closeDialog: () => void;
  isEditing?: boolean;
}

// --- Panel Components ---

const Panel = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col"
  >
    <div className="absolute top-4 right-4 z-10">
      <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
        <X className="h-5 w-5" />
      </Button>
    </div>
    {children}
  </motion.div>
);

const PayerPanel = ({ group, onClose }: { group: Group, onClose: () => void }) => {
    const { control, watch, setValue, getValues } = useFormContext<z.infer<typeof expenseSchema>>();
    const payerType = watch('payerType');

    return (
        <Panel onClose={onClose}>
            <CardHeader className="pt-10">
                <CardTitle>Who paid?</CardTitle>
                <CardDescription>Select a single payer or multiple people.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                 <Tabs defaultValue="single" className="w-full" value={payerType} onValueChange={(v) => setValue('payerType', v as any, { shouldValidate: true })}>
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="single">Single Person</TabsTrigger><TabsTrigger value="multiple">Multiple People</TabsTrigger></TabsList>
                </Tabs>
                <ScrollArea className="flex-1 -mx-4">
                    <div className="px-4">
                        {payerType === 'single' ? (
                            <FormField control={control} name="singlePayerId" render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select who paid..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {group.members.map((member) => (
                                        <SelectItem key={member.uid} value={member.uid}>
                                            {getFullName(member.firstName, member.lastName)}
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        ) : (
                            <div className="space-y-3">
                            {getValues('multiPayers')?.map((item: any, index: number) => (
                                <FormField
                                key={item.userId}
                                control={control}
                                name={`multiPayers.${index}.amount`}
                                render={({ field }) => (
                                    <FormItem>
                                    <div className="flex items-center gap-3">
                                        <FormLabel className="font-normal truncate flex-1">{item.name}</FormLabel>
                                        <FormControl>
                                        <div className="relative w-1/2">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span>
                                            <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                            className="h-9 text-right pl-6"
                                            />
                                        </div>
                                        </FormControl>
                                    </div>
                                    </FormItem>
                                )}
                                />
                            ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
             <div className="p-4 border-t">
                <Button onClick={onClose} className="w-full">Done</Button>
            </div>
        </Panel>
    );
};


const SplitterPanel = ({ onClose }: { onClose: () => void }) => {
    const { control, watch, setValue, getValues } = useFormContext<z.infer<typeof expenseSchema>>();
    const splitType = watch('splitType');
    const participants = watch('participants');

    const splitOptions = [
        { value: 'equally', label: 'Equally', icon: 'Baseline' },
        { value: 'unequally', label: 'Unequally', icon: 'Settle' },
        { value: 'by_shares', label: 'By Shares', icon: 'PieChart' },
        { value: 'by_percentage', label: 'By Percentage', icon: 'Landmark' },
    ] as const;

    return (
        <Panel onClose={onClose}>
            <CardHeader className="pt-10">
                <CardTitle>Split options</CardTitle>
                <CardDescription>Choose how to divide the expense.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                 <div className="grid grid-cols-4 gap-2">
                    {splitOptions.map(opt => {
                        const Icon = Icons[opt.icon];
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setValue('splitType', opt.value, { shouldValidate: true })}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1.5 p-3 border rounded-lg transition-colors",
                                    splitType === opt.value ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/50 hover:bg-muted'
                                )}
                            >
                                <Icon className="h-6 w-6" />
                                <span className="text-xs font-medium">{opt.label}</span>
                            </button>
                        )
                    })}
                </div>

                <ScrollArea className="flex-1 -mx-4">
                    <div className="px-4 space-y-3">
                    {participants.map((item: any, index: number) => {
                        if (!item.selected) return null;
                        return (
                             <div key={item.userId} className="flex items-center gap-4">
                                <FormLabel className="flex-1 flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={item.avatarUrl} /><AvatarFallback>{getInitials(item.name)}</AvatarFallback></Avatar>
                                    <span className="truncate">{item.name}</span>
                                </FormLabel>
                                {splitType === "equally" && <p className="text-sm text-right text-muted-foreground w-32">{CURRENCY_SYMBOL}{(item.amountOwed || 0).toFixed(2)}</p>}
                                {splitType === "unequally" && <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => ( <FormControl><div className="relative w-32"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-right pl-6"/></div></FormControl> )} />}
                                {splitType === "by_shares" && <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => ( <FormControl><div className="relative w-32"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">shares</span><Input type="number" step="1" placeholder="1" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-left pr-14"/></div></FormControl> )} />}
                                {splitType === "by_percentage" && <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => ( <FormControl><div className="relative w-32"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-right pr-6"/></div></FormControl> )} />}
                            </div>
                        )
                    })}
                    </div>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
                <Button onClick={onClose} className="w-full">Done</Button>
            </div>
        </Panel>
    )
}

// --- Main Form Component ---

export function ExpenseForm({ group, closeDialog, isEditing = false }: ExpenseFormProps) {
  const { control, watch, setValue, getValues, formState: { isSubmitting } } =
    useFormContext<z.infer<typeof expenseSchema>>();
  const { settings } = useSiteSettings();
  const { userProfile } = useAuth();
  
  const [activePanel, setActivePanel] = React.useState<'payer' | 'split' | null>(null);

  const watchDescription = watch('description');
  const debouncedDescription = useDebounce(watchDescription, 300);
  const watchAmount = watch('amount');
  const watchSplitType = watch('splitType');
  const watchPayerType = watch('payerType');
  const watchParticipants = watch('participants');
  const watchSinglePayerId = watch('singlePayerId');
  const watchMultiPayers = watch('multiPayers');

  React.useEffect(() => {
    const currentCategory = getValues('category');
    if (debouncedDescription) {
      const { sub: suggestedCategory } = classifyExpense(debouncedDescription, settings.expenseCategories);
      if (suggestedCategory && currentCategory === 'Other') {
        setValue('category', suggestedCategory, { shouldValidate: true });
      }
    }
  }, [debouncedDescription, settings.expenseCategories, getValues, setValue]);

  // Recalculation effect
  React.useEffect(() => {
    const totalAmount = Number(getValues("amount")) || 0;
    const splitType = getValues("splitType");
    const allParticipants = getValues("participants") || [];
    const selectedParticipants = allParticipants.filter((p: any) => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
        allParticipants.forEach((_: any, index: number) => {
             setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
        });
        return;
    }
    
    let amounts: number[] = [];

    if (splitType === 'equally') {
        const baseAmount = totalAmount / numSelected;
        amounts = Array(numSelected).fill(baseAmount);
    } else if (splitType === 'by_shares') {
        const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
        if (totalShares > 0) {
            amounts = selectedParticipants.map(p => (totalAmount * (Number(p.shares) || 1)) / totalShares);
        }
    } else if (splitType === 'by_percentage') {
        amounts = selectedParticipants.map(p => (totalAmount * (Number(p.percentage) || 0)) / 100);
    }

    if (amounts.length > 0) {
        // Distribute rounding errors
        const roundedAmounts = amounts.map(a => parseFloat(a.toFixed(2)));
        let remainder = parseFloat((totalAmount - roundedAmounts.reduce((s, a) => s + a, 0)).toFixed(2));
        
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
            roundedAmounts[i % numSelected] += 0.01 * Math.sign(remainder);
        }

        allParticipants.forEach((p, index) => {
            const selectedIndex = selectedParticipants.findIndex(sp => sp.userId === p.userId);
            if (selectedIndex !== -1) {
                setValue(`participants.${index}.amountOwed`, roundedAmounts[selectedIndex], { shouldValidate: true });
            } else {
                setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
            }
        });
    }
}, [watchAmount, watchSplitType, watchParticipants.filter(p => p.selected).length, JSON.stringify(watchParticipants.map(p => p.shares)), JSON.stringify(watchParticipants.map(p => p.percentage))]);


  const category = watch('category');
  const masterCategory = getMasterCategory(category, settings.expenseCategories);
  const categoryDetails = settings.expenseCategories[masterCategory]?.subCategories?.[category];
  const categoryIconName = categoryDetails?.icon || 'Wallet';
  const CategoryIcon = Icons[categoryIconName];
  
  const getPayerSummary = () => {
    if (watchPayerType === 'single') {
        const payer = group.members.find(m => m.uid === watchSinglePayerId);
        if (!payer) return '...';
        return payer.uid === userProfile?.uid ? 'You' : getFullName(payer.firstName, payer.lastName);
    } else {
        const payingCount = watchMultiPayers?.filter(p => p.amount && p.amount > 0).length || 0;
        if (payingCount === 0) return 'no one';
        if (payingCount === 1) return '1 person';
        return `${payingCount} people`;
    }
  }

  const getUserBalanceInfo = () => {
    const amount = Number(watchAmount) || 0;
    if (amount === 0 || !userProfile) return null;

    const userPaid = watchPayerType === 'single'
        ? (watchSinglePayerId === userProfile.uid ? amount : 0)
        : (watchMultiPayers?.find(p => p.userId === userProfile.uid)?.amount || 0);

    const userOwed = watchParticipants.find(p => p.userId === userProfile.uid)?.amountOwed || 0;
    
    const net = userPaid - userOwed;
    
    if (Math.abs(net) < 0.01) return null;

    return net > 0 ? `You get back ${CURRENCY_SYMBOL}${net.toFixed(2)}` : `You owe ${CURRENCY_SYMBOL}${Math.abs(net).toFixed(2)}`;
  }

  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden bg-background sm:rounded-lg',
        activePanel ? 'md:w-[800px]' : 'md:w-[420px]'
      )}
      style={{ transition: 'width 0.3s ease-in-out' }}
    >
      <motion.div
        animate={{ x: activePanel ? '-50%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="grid grid-cols-2 w-[200%]"
      >
        {/* Main Panel */}
        <div className="w-full flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            {!activePanel && <Button variant="ghost" size="icon" onClick={closeDialog} className="h-8 w-8"><X className="h-5 w-5" /></Button>}
          </div>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
              <FormField control={control} name="description" render={({ field }) => (
                <FormItem>
                    <FormControl><Input placeholder="Description" {...field} className="h-12 text-lg px-2 border-x-0 border-t-0 rounded-none -mx-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" /></FormControl>
                    <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormControl><div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl text-muted-foreground">{CURRENCY_SYMBOL}</span>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-20 border-0 text-5xl font-bold pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0"/>
                    </div></FormControl>
                    <FormMessage />
                </FormItem>
              )} />

              <div className="text-muted-foreground">
                  Paid by <button type="button" onClick={() => setActivePanel('payer')} className="font-bold underline text-primary">{getPayerSummary()}</button> and split <button type="button" onClick={() => setActivePanel('split')} className="font-bold underline text-primary">{watchSplitType}</button>.
                  <span className="block text-xs mt-1">{getUserBalanceInfo()}</span>
              </div>
              
               <div className="grid grid-cols-2 gap-2">
                <FormField control={control} name="category" render={({ field }) => (
                    <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs">
                            <div className="flex items-center gap-1.5">
                                <CategoryIcon className="h-4 w-4" />
                                <SelectValue />
                            </div>
                        </SelectTrigger></FormControl>
                        <SelectContent>
                            {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                                <React.Fragment key={masterCat}>
                                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{masterCat}</p>
                                    {details && details.subCategories && Object.keys(details.subCategories).map(subCat => {
                                        const subDetails = details.subCategories[subCat];
                                        const Icon = subDetails?.icon ? Icons[subDetails.icon] : Icons.Wallet;
                                        return (<SelectItem key={subCat} value={subCat}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{subCat}</span></div></SelectItem>)
                                    })}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={control} name="date" render={({ field }) => (
                    <FormItem>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !field.value && "text-muted-foreground")}>
                                <Icons.Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
              
              <FormField control={control} name="notes" render={({ field }) => (
                <FormItem>
                    <FormControl><Textarea placeholder="Add notes or an image URL..." {...field} className="text-xs min-h-[60px]"/></FormControl>
                    <FormMessage />
                </FormItem>
              )} />
          </CardContent>
          <div className="p-4 mt-auto flex gap-2 border-t">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Side Panel Container */}
        <div className="w-full flex flex-col relative">
          <AnimatePresence>
            {activePanel === 'payer' && <PayerPanel group={group} onClose={() => setActivePanel(null)} />}
            {activePanel === 'split' && <SplitterPanel onClose={() => setActivePanel(null)} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

```
  </change>
  <change>
    <file>src/components/expenses/add-expense-dialog.tsx</file>
    <content><![CDATA[
'use client';

import { useState, useEffect } from 'react';
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

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      date: new Date(),
      notes: '',
      payerType: 'single',
      splitType: 'equally',
      category: 'Other',
    },
  });

  useEffect(() => {
    if (userProfile && open) {
      form.reset({
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
  }, [userProfile, open, group.members, form]);

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
          <FormProviderWrapper>
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
        <FormProviderWrapper>
          <ExpenseForm group={group} closeDialog={() => setOpen(false)} isEditing={false} />
        </FormProviderWrapper>
      </DialogContent>
    </Dialog>
  );
}
