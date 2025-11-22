
'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '../ui/badge';
import { AnimatePresence, motion } from 'framer-motion';

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
  isEditing?: boolean;
}

export function ExpenseForm({ group, isEditing = false }: ExpenseFormProps) {
  const { control, watch, setValue, getValues, formState: { errors } } =
    useFormContext<z.infer<typeof expenseSchema>>();
  const { settings } = useSiteSettings();
  
  const watchDescription = watch('description');
  const debouncedDescription = useDebounce(watchDescription, 300);
  const watchAmount = watch('amount');
  const watchPayerType = watch('payerType');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
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
  
  return (
    <div className="space-y-4">
      <FormField control={control} name="description" render={({ field }) => (
        <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Input placeholder="e.g., Dinner at BBQ Nation" {...field} /></FormControl>
            <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="amount" render={({ field }) => (
        <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl><div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span>
                <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="pl-6"/>
            </div></FormControl>
            <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
          <FormField control={control} name="category" render={({ field }) => (
            <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger>
                        <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4" />
                            <SelectValue />
                        </div>
                    </SelectTrigger></FormControl>
                    <SelectContent>
                        {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                            <React.Fragment key={masterCat}>
                                {details && details.subCategories && (
                                  <>
                                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{masterCat}</p>
                                    {Object.keys(details.subCategories).map(subCat => {
                                        const subDetails = details.subCategories[subCat];
                                        const Icon = subDetails?.icon ? Icons[subDetails.icon] : Icons.Wallet;
                                        return (<SelectItem key={subCat} value={subCat}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{subCat}</span></div></SelectItem>)
                                    })}
                                  </>
                                )}
                            </React.Fragment>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )}/>
        <FormField control={control} name="date" render={({ field }) => (
            <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <Icons.Calendar className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                <FormMessage />
            </FormItem>
        )} />
      </div>

       <FormField control={control} name="payerType" render={({ field }) => (
        <FormItem>
          <FormLabel>Paid By</FormLabel>
          <FormControl>
            <Tabs defaultValue="single" className="w-full" value={field.value} onValueChange={(v) => field.onChange(v as any)}>
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="single">Single Person</TabsTrigger><TabsTrigger value="multiple">Multiple People</TabsTrigger></TabsList>
            </Tabs>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
       <AnimatePresence>
        {watchPayerType === 'single' ? (
          <motion.div key="single" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <FormField control={control} name="singlePayerId" render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select who paid..." /></SelectTrigger></FormControl>
                  <SelectContent>{group.members.map(m => <SelectItem key={m.uid} value={m.uid}>{getFullName(m.firstName, m.lastName)}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </motion.div>
        ) : (
          <motion.div key="multiple" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
            {getValues('multiPayers')?.map((_, index) => (
              <FormField key={index} control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormLabel className="font-normal w-1/2">{getValues(`multiPayers.${index}.name`)}</FormLabel>
                  <div className="relative w-1/2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="pl-6"/></div>
                </FormItem>
              ))} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
       <FormField control={control} name="splitType" render={({ field }) => (
        <FormItem>
          <FormLabel>Split Method</FormLabel>
          <FormControl>
            <Tabs defaultValue="equally" className="w-full" value={field.value} onValueChange={(v) => field.onChange(v as any)}>
              <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="equally">Equally</TabsTrigger><TabsTrigger value="unequally">Unequally</TabsTrigger><TabsTrigger value="by_shares">Shares</TabsTrigger><TabsTrigger value="by_percentage">%</TabsTrigger></TabsList>
            </Tabs>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
       <div className="space-y-2">
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
                        {p.selected && (
                            <>
                                {watchSplitType === "equally" && <p className="text-sm text-right text-muted-foreground w-24">{CURRENCY_SYMBOL}{(p.amountOwed || 0).toFixed(2)}</p>}
                                {watchSplitType === "unequally" && <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => ( <FormControl><div className="relative w-24"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-right pl-6"/></div></FormControl> )} />}
                                {watchSplitType === "by_shares" && <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => ( <FormControl><div className="relative w-24"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">shares</span><Input type="number" step="1" placeholder="1" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-left pr-14"/></div></FormControl> )} />}
                                {watchSplitType === "by_percentage" && <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => ( <FormControl><div className="relative w-24"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="h-9 text-right pr-6"/></div></FormControl> )} />}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </ScrollArea>
      </div>

    </div>
  );
}
