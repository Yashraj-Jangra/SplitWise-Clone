'use client';

import * as React from 'react';
import { useForm, useWatch, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
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
  const [isCategoryExpanded, setIsCategoryExpanded] = React.useState(false);

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
      setIsCategoryExpanded(false);
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
  const showDistributionGraph =
    categoryAllocations.list.length > 0 || isCategoryExpanded || categoryAllocations.isOverTotal;

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize} className="gap-1.5 font-medium rounded-xl">
      <Icons.Currency className="h-4 w-4" />
      <span>{initialBudget?.enabled ? 'Edit Budget' : 'Set Budget'}</span>
    </Button>
  );

  // ── Main Form View (Left Pane) ──
  const MainView = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-5 sm:px-6 py-4 overflow-y-auto">
        <div className="space-y-5 pb-2">
          {/* Enable / Disable Switch */}
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/40 p-3 space-y-0 shadow-sm">
                <div>
                  <FormLabel className="text-sm font-medium">Monthly tracking</FormLabel>
                  <FormDescription className="text-xs text-muted-foreground">
                    Calculate safe daily burn rates & pacing
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
                      Sum ({CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')})
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

          {/* Visual Allocation Meter (Shown when configured or when panel is expanded) */}
          {showDistributionGraph && (
            <div className="rounded-xl border border-border/40 bg-muted/15 p-3.5 space-y-2.5 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Icons.PieChart className="h-3.5 w-3.5 text-primary" />
                  Distribution
                </span>
                <span
                  className={cn(
                    'font-medium text-[11px]',
                    categoryAllocations.isOverTotal ? 'text-rose-400 font-bold' : 'text-muted-foreground'
                  )}
                >
                  {categoryAllocations.isOverTotal
                    ? `Over-allocated by ${CURRENCY_SYMBOL}${categoryAllocations.diff.toLocaleString('en-IN')}`
                    : `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} / ${CURRENCY_SYMBOL}${currentTotal.toLocaleString('en-IN')} assigned`}
                </span>
              </div>

              {/* Segmented Bar */}
              <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/30">
                {categoryAllocations.isOverTotal ? (
                  <div
                    className="h-full w-full bg-rose-500 animate-pulse flex items-center justify-center text-[9px] text-white font-bold tracking-wider"
                    title={`Allocations exceed total budget`}
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
                        title={`Unallocated buffer: ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')}`}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Over allocation banner */}
              {categoryAllocations.isOverTotal && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <span className="leading-tight text-[11px]">
                    Category caps exceed monthly budget limit.
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
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[10px] text-muted-foreground">
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
                </div>
              )}
            </div>
          )}

          {/* ── Category Wise Budget Expander Trigger (Sideways expansion) ── */}
          <div className="space-y-1.5">
            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Category Wise Budget
            </FormLabel>
            <button
              type="button"
              onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
              className={cn(
                'w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 group',
                isCategoryExpanded
                  ? 'bg-primary/10 border-primary/40 shadow-sm'
                  : 'bg-muted/15 border-border/40 hover:bg-muted/30 hover:border-border/60'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isCategoryExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
                  )}
                >
                  <Icons.PieChart className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>Category Allocations</span>
                    {categoryAllocations.list.length > 0 && (
                      <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.2 rounded-full">
                        {categoryAllocations.list.length} active
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {categoryAllocations.list.length > 0
                      ? `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} assigned across ${categoryAllocations.list.length} categories`
                      : 'Set optional spending limits per category'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0 pl-2">
                <span>{isCategoryExpanded ? 'Collapse' : 'Configure'}</span>
                <Icons.ArrowRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isCategoryExpanded && 'rotate-90 sm:rotate-0 sm:translate-x-0.5'
                  )}
                />
              </div>
            </button>
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

      {/* Main Footer Actions */}
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
            form="set-budget-form"
            disabled={isSubmitting || categoryAllocations.isOverTotal}
            className="h-10 rounded-xl text-sm font-medium px-5"
          >
            {isSubmitting ? 'Saving...' : 'Save Budget'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Expanded Category View (Right Pane on Desktop, Slide-in on Mobile) ──
  const CategoryExpandedPane = (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Pane Header */}
      <div className="p-4 sm:px-6 border-b border-border/30 flex items-center justify-between shrink-0 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
            <Icons.PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Category Caps</h3>
            <p className="text-[11px] text-muted-foreground">
              {categoryAllocations.list.length} of {MASTER_CATEGORIES.length} allocated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {categoryAllocations.list.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const emptyCats = Object.fromEntries(MASTER_CATEGORIES.map((c) => [c.key, '']));
                form.setValue('categories', emptyCats);
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium px-2 py-1"
            >
              Clear All
            </button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsCategoryExpanded(false)}
            className="h-7 w-7 rounded-lg hover:bg-muted"
            title="Collapse panel"
          >
            <Icons.Close className="h-4 w-4" />
            <span className="sr-only">Close category panel</span>
          </Button>
        </div>
      </div>

      {/* Category List */}
      <ScrollArea className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
        <div className="space-y-3 pb-4">
          {/* Live Distribution Bar in Category View */}
          <div className="rounded-xl border border-border/40 bg-background/80 p-3 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Icons.PieChart className="h-3.5 w-3.5 text-primary" />
                Live Distribution
              </span>
              <span
                className={cn(
                  'font-medium text-[11px]',
                  categoryAllocations.isOverTotal ? 'text-rose-400 font-bold' : 'text-muted-foreground'
                )}
              >
                {categoryAllocations.isOverTotal
                  ? `Over by ${CURRENCY_SYMBOL}${categoryAllocations.diff.toLocaleString('en-IN')}`
                  : `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} of ${CURRENCY_SYMBOL}${currentTotal.toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/30">
              {categoryAllocations.isOverTotal ? (
                <div className="h-full w-full bg-rose-500 animate-pulse flex items-center justify-center text-[9px] text-white font-bold tracking-wider">
                  EXCEEDED BY {CURRENCY_SYMBOL}{categoryAllocations.diff.toLocaleString('en-IN')}
                </div>
              ) : (
                <>
                  {categoryAllocations.list.map((item) => (
                    <div
                      key={item.cat.key}
                      style={{ width: `${Math.max(1, item.pctOfTotal)}%`, backgroundColor: item.cat.color }}
                      className="h-full transition-all duration-300 relative group first:rounded-l-full"
                      title={`${item.cat.name}: ${CURRENCY_SYMBOL}${item.amount.toLocaleString('en-IN')} (${item.pctOfTotal.toFixed(0)}%)`}
                    />
                  ))}
                  {unallocatedPct > 0 && currentTotal > 0 && (
                    <div
                      style={{ width: `${unallocatedPct}%` }}
                      className="h-full bg-muted/40 transition-all duration-300 last:rounded-r-full"
                      title={`Unallocated buffer: ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')}`}
                    />
                  )}
                </>
              )}
            </div>

            {categoryAllocations.isOverTotal && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <span className="leading-tight text-[11px]">
                  Exceeds total monthly budget limit.
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
          </div>

          {MASTER_CATEGORIES.map((cat) => {
            const IconComp = Icons[cat.icon] || Icons.Wallet;
            const currentVal = form.watch(`categories.${cat.key}`) || '';
            const numVal = Number(currentVal) || 0;
            const pct = currentTotal > 0 && numVal > 0 ? (numVal / currentTotal) * 100 : 0;

            return (
              <div
                key={cat.key}
                className={cn(
                  'flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all duration-200',
                  numVal > 0
                    ? 'bg-background border-border/80 shadow-xs'
                    : 'bg-background/50 border-border/30 hover:border-border/60'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn('p-2 rounded-lg shrink-0', cat.bgLight)}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{cat.name}</p>
                    {pct > 0 ? (
                      <p className="text-[10px] text-muted-foreground font-mono font-medium">
                        {pct.toFixed(0)}% of monthly budget
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No cap set</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 w-28 shrink-0">
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
                    className="h-8 text-xs px-2 text-right rounded-lg bg-muted/20 border-border/40 focus:border-primary font-medium"
                  />
                  {numVal > 0 && (
                    <button
                      type="button"
                      onClick={() => form.setValue(`categories.${cat.key}`, '')}
                      className="text-muted-foreground hover:text-foreground text-xs p-1"
                      title="Clear cap"
                    >
                      <Icons.Close className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pane Footer Summary */}
      <div className="p-3.5 sm:px-6 border-t border-border/30 bg-background/80 backdrop-blur-sm flex items-center justify-between text-xs shrink-0">
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground font-medium">Total Allocated</p>
          <p className="text-sm font-bold text-foreground font-sans">
            {CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              of {CURRENCY_SYMBOL}{currentTotal.toLocaleString('en-IN')}
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsCategoryExpanded(false)}
          className="h-8 rounded-xl text-xs font-semibold px-4"
        >
          Done
        </Button>
      </div>
    </div>
  );

  // Desktop Split / Expanded Layout
  const DesktopLayout = (
    <div className="flex w-full overflow-hidden">
      {/* Left Main Form */}
      <div className="flex-shrink-0 w-full sm:w-[480px]">
        {MainView}
      </div>

      {/* Right Animated Category Pane */}
      <AnimatePresence>
        {isCategoryExpanded && (
          <motion.div
            key="category-pane"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden flex flex-col border-l border-border/40"
          >
            {CategoryExpandedPane}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>}
        <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background overflow-hidden">
          <SheetHeader className="p-4 sm:p-6 pb-3 border-b border-border/20 text-left shrink-0">
            <SheetTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Icons.Currency className="h-5 w-5 text-primary" />
              Monthly Budget
            </SheetTitle>
          </SheetHeader>
          <FormProvider {...form}>
            <form id="set-budget-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              {isCategoryExpanded ? CategoryExpandedPane : MainView}
            </form>
          </FormProvider>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          'p-0 gap-0 transition-all duration-300 w-auto max-w-none sm:max-w-none rounded-2xl overflow-hidden border-border/20 shadow-2xl bg-background flex flex-col max-h-[90vh]',
          isCategoryExpanded ? 'sm:w-[900px]' : 'sm:w-[480px]'
        )}
        onInteractOutside={(e) => {
          if (isCategoryExpanded) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-6 pb-3 border-b border-border/20 text-left shrink-0">
          <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
            <Icons.Currency className="h-5 w-5 text-primary" />
            Monthly Budget
          </DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form id="set-budget-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            {DesktopLayout}
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
