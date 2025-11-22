
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
import type { Group, UserProfile } from '@/types';
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
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '../ui/badge';

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
        path: ['-'], // General error for the array
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

const Panel = ({ children, onClose, title, description }: { children: React.ReactNode; onClose: () => void; title: string, description: string }) => (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className="absolute inset-0 bg-background flex flex-col"
  >
    <CardHeader className="pt-8">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
    </CardHeader>
    {children}
    <CardFooter className="p-4 border-t mt-auto">
        <Button onClick={onClose} className="w-full">Done</Button>
    </CardFooter>
  </motion.div>
);

const PayerPanel = ({ group, onClose }: { group: Group, onClose: () => void }) => {
    const { control, watch, setValue, getValues } = useFormContext<z.infer<typeof expenseSchema>>();
    const payerType = watch('payerType');

    return (
        <Panel onClose={onClose} title="Paid By" description="Select who paid for this expense.">
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
        <Panel onClose={onClose} title="Split Options" description="Choose how to divide the expense.">
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
        </Panel>
    )
}

// --- Main Form Component ---

export function ExpenseForm({ group, closeDialog, isEditing = false }: ExpenseFormProps) {
  const { control, watch, setValue, getValues, formState: { isSubmitting, errors } } =
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
  const participantDeps = JSON.stringify(watchParticipants.map(p => ({ s: p.selected, sh: p.shares, pe: p.percentage })));


  // Auto-suggest category based on description
  React.useEffect(() => {
    if (!debouncedDescription) return;
    const currentCategory = getValues('category');
    const { sub: suggestedCategory } = classifyExpense(debouncedDescription, settings.expenseCategories);
    if (suggestedCategory && suggestedCategory !== currentCategory) {
        setValue('category', suggestedCategory, { shouldValidate: true });
    }
  }, [debouncedDescription, settings.expenseCategories, getValues, setValue]);

  // Recalculate split amounts when dependencies change
  React.useEffect(() => {
    const totalAmount = Number(watchAmount) || 0;
    const allParticipants = getValues('participants') || [];
    const selectedParticipants = allParticipants.filter(p => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
        allParticipants.forEach((_, index) => {
             setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
        });
        return;
    }
    
    let amounts: number[] = [];

    if (watchSplitType === 'equally') {
        amounts = Array(numSelected).fill(totalAmount / numSelected);
    } else if (watchSplitType === 'by_shares') {
        const totalShares = selectedParticipants.reduce((sum, p) => sum + (Number(p.shares) || 1), 0);
        if (totalShares > 0) {
            amounts = selectedParticipants.map(p => (totalAmount * (Number(p.shares) || 1)) / totalShares);
        }
    } else if (watchSplitType === 'by_percentage') {
        amounts = selectedParticipants.map(p => (totalAmount * (Number(p.percentage) || 0)) / 100);
    } else {
        return; // Don't auto-calculate for 'unequally'
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
  }, [watchAmount, watchSplitType, participantDeps, setValue, getValues]);


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
  
  const selectedParticipantList = watchParticipants.filter(p => p.selected);

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
        <div className="w-full flex flex-col h-full">
           <div className="absolute top-2 right-2 z-10">
            {!activePanel && <Button variant="ghost" size="icon" onClick={closeDialog} className="h-9 w-9"><X className="h-5 w-5" /></Button>}
          </div>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto">
              {selectedParticipantList.length > 0 && (
                <div className="space-y-2">
                    <FormLabel>With</FormLabel>
                    <div className="flex flex-wrap gap-2">
                        {selectedParticipantList.map((p, index) => (
                            <Badge key={p.userId} variant="secondary" className="pl-2">
                                {p.name}
                                <button type="button" onClick={() => setValue(`participants.${watchParticipants.findIndex(par => par.userId === p.userId)}.selected`, false, { shouldValidate: true })} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                </div>
              )}
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

              <div className="text-muted-foreground text-lg">
                  Paid by <button type="button" onClick={() => setActivePanel('payer')} className="font-bold underline text-primary">{getPayerSummary()}</button> and split <button type="button" onClick={() => setActivePanel('split')} className="font-bold underline text-primary">{watchSplitType}</button>.
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
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
                    <FormControl><Textarea placeholder="Add notes..." {...field} className="text-sm min-h-[60px]"/></FormControl>
                    <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-2 pt-2">
                <FormLabel>Participants</FormLabel>
                <ScrollArea className="h-40 border rounded-md">
                    <div className="p-2 space-y-1">
                        {watchParticipants.map((p, index) => (
                             <div key={p.userId} className={cn("flex items-center gap-3 p-2 rounded-md", p.selected ? "bg-muted/50" : "")}>
                                <FormField
                                    control={control}
                                    name={`participants.${index}.selected`}
                                    render={({ field }) => (
                                        <FormItem className="flex items-center">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <Avatar className="h-8 w-8"><AvatarImage src={p.avatarUrl} /><AvatarFallback>{getInitials(p.name)}</AvatarFallback></Avatar>
                                <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
              </div>

          </CardContent>
          <CardFooter className="p-4 mt-auto flex gap-2 border-t">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </CardFooter>
        </div>

        {/* Side Panel Container */}
        <div className="w-full flex flex-col relative h-full">
          <AnimatePresence>
            {activePanel === 'payer' && <PayerPanel group={group} onClose={() => setActivePanel(null)} />}
            {activePanel === 'split' && <SplitterPanel onClose={() => setActivePanel(null)} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
