'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { updateGroup } from '@/lib/firestore.service';
import { useAuth } from '@/contexts/auth-context';
import { appEventEmitter } from '@/lib/event-emitter';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Group, GroupBudget } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const budgetSchema = z.object({
  monthlyLimit: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Please enter a budget amount.' }).min(100, 'Minimum budget is ₹100').max(10000000, 'Budget too high')
  ),
  enabled: z.boolean().default(true),
  threshold75: z.boolean().default(true),
  threshold90: z.boolean().default(true),
  threshold100: z.boolean().default(true),
  categories: z.record(z.string(), z.string()).optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

const QUICK_PRESETS = [10000, 25000, 50000, 100000];

interface CategoryMeta {
  key: string;
  name: string;
  icon: keyof typeof Icons;
  color: string;
  bgLight: string;
}

const MASTER_CATEGORIES: CategoryMeta[] = [
  { key: 'Food and Drink', name: 'Food & Drink', icon: 'Food', color: '#3b82f6', bgLight: 'bg-blue-500/15 text-blue-400' },
  { key: 'Transportation', name: 'Transportation', icon: 'Car', color: '#8b5cf6', bgLight: 'bg-violet-500/15 text-violet-400' },
  { key: 'Housing', name: 'Housing', icon: 'Home', color: '#10b981', bgLight: 'bg-emerald-500/15 text-emerald-400' },
  { key: 'Utilities', name: 'Utilities', icon: 'Electricity', color: '#f59e0b', bgLight: 'bg-amber-500/15 text-amber-400' },
  { key: 'Entertainment', name: 'Entertainment', icon: 'Movie', color: '#ec4899', bgLight: 'bg-pink-500/15 text-pink-400' },
  { key: 'Shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#06b6d4', bgLight: 'bg-cyan-500/15 text-cyan-400' },
  { key: 'Health and Wellness', name: 'Health & Wellness', icon: 'HeartPulse', color: '#ef4444', bgLight: 'bg-red-500/15 text-red-400' },
  { key: 'Personal Care', name: 'Personal Care', icon: 'Wallet', color: '#a855f7', bgLight: 'bg-purple-500/15 text-purple-400' },
  { key: 'Education', name: 'Education', icon: 'Education', color: '#6366f1', bgLight: 'bg-indigo-500/15 text-indigo-400' },
  { key: 'Gifts and Donations', name: 'Gifts & Donations', icon: 'Gift', color: '#eab308', bgLight: 'bg-yellow-500/15 text-yellow-400' },
  { key: 'Travel', name: 'Travel', icon: 'Plane', color: '#14b8a6', bgLight: 'bg-teal-500/15 text-teal-400' },
  { key: 'Other', name: 'Other / Misc', icon: 'Wallet', color: '#64748b', bgLight: 'bg-slate-500/15 text-slate-400' },
];

interface SetBudgetDialogProps {
  group: Group;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
}

export function SetBudgetDialog({
  group,
  trigger,
  open: controlledOpen,
  onOpenChange,
  buttonVariant = 'outline',
  buttonSize = 'sm',
}: SetBudgetDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isMobile = useIsMobile();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const initialBudget: GroupBudget | undefined = group.budget;

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      monthlyLimit: initialBudget?.monthlyLimit || 25000,
      enabled: initialBudget ? initialBudget.enabled : true,
      threshold75: initialBudget?.alertThresholds ? initialBudget.alertThresholds.includes(75) : true,
      threshold90: initialBudget?.alertThresholds ? initialBudget.alertThresholds.includes(90) : true,
      threshold100: initialBudget?.alertThresholds ? initialBudget.alertThresholds.includes(100) : true,
      categories: initialBudget?.categoryLimits
        ? Object.fromEntries(Object.entries(initialBudget.categoryLimits).map(([k, v]) => [k, String(v)]))
        : {},
    },
  });

  const watchMonthlyLimit = useWatch({ control: form.control, name: 'monthlyLimit' });
  const watchCategories = useWatch({ control: form.control, name: 'categories' });

  // Compute total of category inputs
  const categoryAllocations = React.useMemo(() => {
    const list: { cat: CategoryMeta; amount: number; pctOfTotal: number }[] = [];
    let sum = 0;
    const total = Number(watchMonthlyLimit) || 0;

    MASTER_CATEGORIES.forEach((cat) => {
      const val = Number(watchCategories?.[cat.key]) || 0;
      if (val > 0) {
        sum += val;
        list.push({
          cat,
          amount: val,
          pctOfTotal: total > 0 ? (val / total) * 100 : 0,
        });
      }
    });

    return { list, sum, isOverTotal: total > 0 && sum > total, diff: sum - total };
  }, [watchCategories, watchMonthlyLimit]);

  // Handle Auto-Summing to Total
  const handleAutoSumFromCategories = React.useCallback(() => {
    if (categoryAllocations.sum > 0) {
      form.setValue('monthlyLimit', categoryAllocations.sum, { shouldValidate: true });
    }
  }, [categoryAllocations.sum, form]);

  // Auto update total if total budget is empty / 0 and category amounts are entered
  const prevCategorySumRef = React.useRef(categoryAllocations.sum);
  React.useEffect(() => {
    const currentTotal = Number(form.getValues('monthlyLimit')) || 0;
    if (currentTotal === 0 && categoryAllocations.sum > 0 && prevCategorySumRef.current !== categoryAllocations.sum) {
      form.setValue('monthlyLimit', categoryAllocations.sum, { shouldValidate: true });
    }
    prevCategorySumRef.current = categoryAllocations.sum;
  }, [categoryAllocations.sum, form]);

  React.useEffect(() => {
    if (open) {
      const b = group.budget;
      form.reset({
        monthlyLimit: b?.monthlyLimit || 25000,
        enabled: b ? b.enabled : true,
        threshold75: b?.alertThresholds ? b.alertThresholds.includes(75) : true,
        threshold90: b?.alertThresholds ? b.alertThresholds.includes(90) : true,
        threshold100: b?.alertThresholds ? b.alertThresholds.includes(100) : true,
        categories: b?.categoryLimits
          ? Object.fromEntries(Object.entries(b.categoryLimits).map(([k, v]) => [k, String(v)]))
          : {},
      });
    }
  }, [open, group.budget, form]);

  async function onSubmit(values: BudgetFormValues) {
    if (!userProfile) return;

    const totalLimit = Number(values.monthlyLimit);
    if (categoryAllocations.isOverTotal) {
      toast({
        title: 'Budget Allocation Error',
        description: `Total category budgets (${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')}) cannot exceed the monthly limit (${CURRENCY_SYMBOL}${totalLimit.toLocaleString('en-IN')}).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const alertThresholds: number[] = [];
      if (values.threshold75) alertThresholds.push(75);
      if (values.threshold90) alertThresholds.push(90);
      if (values.threshold100) alertThresholds.push(100);

      const categoryLimits: Record<string, number> = {};
      if (values.categories) {
        Object.entries(values.categories).forEach(([cat, val]) => {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            categoryLimits[cat] = num;
          }
        });
      }

      const budgetData: GroupBudget = {
        monthlyLimit: totalLimit,
        enabled: values.enabled,
        alertThresholds,
        categoryLimits: Object.keys(categoryLimits).length > 0 ? categoryLimits : undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile.uid,
      };

      await updateGroup(group.id, { budget: budgetData }, userProfile.uid);

      toast({
        title: 'Budget Saved',
        description: values.enabled
          ? `Monthly budget set to ${CURRENCY_SYMBOL}${totalLimit.toLocaleString('en-IN')}.`
          : 'Monthly budget disabled.',
      });

      appEventEmitter.emit('data-changed');
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update budget.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDisableBudget = async () => {
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      await updateGroup(
        group.id,
        {
          budget: {
            monthlyLimit: 0,
            enabled: false,
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile.uid,
          },
        },
        userProfile.uid
      );
      toast({ title: 'Budget Disabled', description: 'Group budget tracking turned off.' });
      appEventEmitter.emit('data-changed');
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to remove budget.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTotal = Number(watchMonthlyLimit) || 0;
  const unallocatedAmount = Math.max(0, currentTotal - categoryAllocations.sum);
  const unallocatedPct = currentTotal > 0 ? (unallocatedAmount / currentTotal) * 100 : 0;

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize} className="gap-1.5 font-medium rounded-xl">
      <Icons.Currency className="h-4 w-4" />
      <span>{initialBudget?.enabled ? 'Edit Budget' : 'Set Budget'}</span>
    </Button>
  );

  const formBody = (
    <Form {...form}>
      <form id="set-budget-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Scrollable Form Body */}
        <ScrollArea className="flex-1 px-5 sm:px-6 py-4 overflow-y-auto">
          <div className="space-y-5 pb-4">
            {/* Enable / Disable Switch */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/40 p-3 space-y-0 shadow-sm">
                  <div>
                    <FormLabel className="text-sm font-medium">Monthly budget tracking</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      Track limits, pacing, and safe daily burn rate
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Hero Amount Input */}
            <FormField
              control={form.control}
              name="monthlyLimit"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Monthly Budget
                    </FormLabel>
                    {categoryAllocations.sum > 0 && categoryAllocations.sum !== currentTotal && (
                      <button
                        type="button"
                        onClick={handleAutoSumFromCategories}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Icons.Sparkles className="h-3 w-3" />
                        Sum from categories ({CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-baseline border-b-2 border-border/40 focus-within:border-primary transition-colors pb-1">
                    <span className="text-[clamp(2rem,8vw,2.75rem)] font-bold text-muted-foreground align-baseline leading-none">
                      {CURRENCY_SYMBOL}
                    </span>
                    <FormControl>
                      <Input
                        type="number"
                        step="100"
                        placeholder="25000"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="pl-2 text-[clamp(2rem,8vw,2.75rem)] leading-none font-bold border-none !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent !focus-visible:bg-transparent shadow-none px-0 focus:border-primary h-auto focus-visible:ring-0 focus-visible:ring-offset-0 hide-number-arrows"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('monthlyLimit', preset, { shouldValidate: true })}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border',
                          currentTotal === preset
                            ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                            : 'bg-muted/30 text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/60'
                        )}
                      >
                        {CURRENCY_SYMBOL}{preset.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* ── Visual Allocation Comparison Graph ── */}
            <div className="rounded-xl border border-border/40 bg-muted/15 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Icons.PieChart className="h-3.5 w-3.5 text-primary" />
                  Budget Distribution
                </span>
                <span
                  className={cn(
                    'font-medium text-[11px]',
                    categoryAllocations.isOverTotal ? 'text-rose-400 font-bold' : 'text-muted-foreground'
                  )}
                >
                  {categoryAllocations.isOverTotal
                    ? `Over-allocated by ${CURRENCY_SYMBOL}${categoryAllocations.diff.toLocaleString('en-IN')}`
                    : `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} of ${CURRENCY_SYMBOL}${currentTotal.toLocaleString('en-IN')} assigned`}
                </span>
              </div>

              {/* Multi-Colored Segmented Progress Bar */}
              <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/30">
                {categoryAllocations.isOverTotal ? (
                  <div
                    className="h-full w-full bg-rose-500 animate-pulse flex items-center justify-center text-[9px] text-white font-bold tracking-wider"
                    title={`Allocations (${CURRENCY_SYMBOL}${categoryAllocations.sum}) exceed total budget (${CURRENCY_SYMBOL}${currentTotal})`}
                  >
                    EXCEEDED BY {CURRENCY_SYMBOL}{categoryAllocations.diff.toLocaleString('en-IN')}
                  </div>
                ) : (
                  <>
                    {categoryAllocations.list.map((item) => (
                      <div
                        key={item.cat.key}
                        style={{ width: `${Math.max(1, item.pctOfTotal)}%`, backgroundColor: item.cat.color }}
                        className="h-full transition-all duration-300 relative group cursor-pointer first:rounded-l-full"
                        title={`${item.cat.name}: ${CURRENCY_SYMBOL}${item.amount.toLocaleString('en-IN')} (${item.pctOfTotal.toFixed(0)}%)`}
                      />
                    ))}
                    {unallocatedPct > 0 && currentTotal > 0 && (
                      <div
                        style={{ width: `${unallocatedPct}%` }}
                        className="h-full bg-muted/40 transition-all duration-300 last:rounded-r-full"
                        title={`Unallocated buffer: ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')} (${unallocatedPct.toFixed(0)}%)`}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Over-allocation warning banner + quick fix CTA */}
              {categoryAllocations.isOverTotal && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <span className="leading-tight text-[11px]">
                    Category budgets exceed the monthly limit.
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoSumFromCategories}
                    className="px-2 py-1 rounded bg-rose-500 text-white font-semibold text-[10px] shrink-0 hover:bg-rose-600 transition-colors"
                  >
                    Sync to {CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')}
                  </button>
                </div>
              )}

              {/* Dynamic Legend */}
              {categoryAllocations.list.length > 0 && !categoryAllocations.isOverTotal && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground">
                  {categoryAllocations.list.map((item) => (
                    <div key={item.cat.key} className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.cat.color }}
                      />
                      <span className="font-medium text-foreground">{item.cat.name}</span>
                      <span>({item.pctOfTotal.toFixed(0)}%)</span>
                    </div>
                  ))}
                  {unallocatedAmount > 0 && currentTotal > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground/70">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span>Unallocated ({unallocatedPct.toFixed(0)}%)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Category Allocations Grid ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category Limits ({categoryAllocations.list.length} configured)
                </FormLabel>
                <span className="text-[11px] text-muted-foreground">Optional caps per category</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
                {MASTER_CATEGORIES.map((cat) => {
                  const IconComp = Icons[cat.icon] || Icons.Wallet;
                  const currentVal = form.watch(`categories.${cat.key}`) || '';
                  const numVal = Number(currentVal) || 0;
                  const pct = currentTotal > 0 && numVal > 0 ? (numVal / currentTotal) * 100 : 0;

                  return (
                    <div
                      key={cat.key}
                      className={cn(
                        'flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors',
                        numVal > 0
                          ? 'bg-muted/20 border-border/60'
                          : 'bg-background border-border/30 hover:border-border/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn('p-1.5 rounded-lg shrink-0', cat.bgLight)}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{cat.name}</p>
                          {pct > 0 && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {pct.toFixed(0)}% of budget
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 w-24 shrink-0">
                        <span className="text-xs text-muted-foreground font-semibold">
                          {CURRENCY_SYMBOL}
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={currentVal}
                          onChange={(e) => {
                            form.setValue(`categories.${cat.key}`, e.target.value);
                          }}
                          className="h-8 text-xs px-2 text-right rounded-lg bg-muted/20 border-border/40 focus:border-primary"
                        />
                        {numVal > 0 && (
                          <button
                            type="button"
                            onClick={() => form.setValue(`categories.${cat.key}`, '')}
                            className="text-muted-foreground hover:text-foreground text-xs p-0.5"
                            title="Clear"
                          >
                            <Icons.Close className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alert Thresholds */}
            <div className="space-y-1.5 pt-1">
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Notification Benchmarks
              </FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'threshold75', label: '75% Caution' },
                  { name: 'threshold90', label: '90% Warning' },
                  { name: 'threshold100', label: '100% Exceeded' },
                ].map((t) => (
                  <FormField
                    key={t.name}
                    control={form.control}
                    name={t.name as any}
                    render={({ field }) => (
                      <label
                        className={cn(
                          'flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors select-none',
                          field.value
                            ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                            : 'bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{t.label}</span>
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Sticky Footer */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-t border-border/20 bg-background/95 backdrop-blur-sm gap-2 shrink-0">
          {initialBudget?.monthlyLimit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDisableBudget}
              disabled={isSubmitting}
              className="h-10 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-3 rounded-xl"
            >
              Turn Off
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="h-10 rounded-xl text-sm font-medium px-4 hover:bg-muted hover:text-foreground transition-colors border-border/40"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || categoryAllocations.isOverTotal}
              className="h-10 rounded-xl text-sm font-medium px-5"
            >
              {isSubmitting ? 'Saving...' : 'Save Budget'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>}
        <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background overflow-hidden">
          <SheetHeader className="p-4 sm:p-6 pb-2 border-b border-border/20 text-left shrink-0">
            <SheetTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Icons.Currency className="h-5 w-5 text-primary" />
              Monthly Budget
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            {formBody}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[520px] p-0 border-border/20 rounded-2xl shadow-2xl bg-background overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-3 border-b border-border/20 text-left shrink-0">
          <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
            <Icons.Currency className="h-5 w-5 text-primary" />
            Monthly Budget
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          {formBody}
        </div>
      </DialogContent>
    </Dialog>
  );
}
