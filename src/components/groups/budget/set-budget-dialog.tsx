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
import { updateGroup } from '@/lib/api.client';
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
}

const MASTER_CATEGORIES: CategoryMeta[] = [
  { key: 'Food and Drink', name: 'Food & Drink', icon: 'Food', color: '#3b82f6' },
  { key: 'Transportation', name: 'Transportation', icon: 'Car', color: '#8b5cf6' },
  { key: 'Housing', name: 'Housing', icon: 'Home', color: '#10b981' },
  { key: 'Utilities', name: 'Utilities', icon: 'Electricity', color: '#f59e0b' },
  { key: 'Entertainment', name: 'Entertainment', icon: 'Movie', color: '#ec4899' },
  { key: 'Shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#06b6d4' },
  { key: 'Health and Wellness', name: 'Health & Wellness', icon: 'HeartPulse', color: '#ef4444' },
  { key: 'Personal Care', name: 'Personal Care', icon: 'Wallet', color: '#a855f7' },
  { key: 'Education', name: 'Education', icon: 'Education', color: '#6366f1' },
  { key: 'Gifts and Donations', name: 'Gifts & Donations', icon: 'Gift', color: '#eab308' },
  { key: 'Travel', name: 'Travel', icon: 'Plane', color: '#14b8a6' },
  { key: 'Other', name: 'Miscellaneous', icon: 'Wallet', color: '#64748b' },
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
    <Button variant={buttonVariant} size={buttonSize} className="gap-1.5 font-medium">
      <Icons.Currency className="h-4 w-4" />
      <span>{initialBudget?.enabled ? 'Edit Budget' : 'Set Budget'}</span>
    </Button>
  );

  // ── Distribution Progress Bar ──
  const DistributionMeter = (
    <div className="rounded-md border border-border/30 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Budget Allocation</span>
        <span
          className={cn(
            'text-[11px] font-mono',
            categoryAllocations.isOverTotal ? 'text-destructive font-semibold' : 'text-muted-foreground'
          )}
        >
          {categoryAllocations.isOverTotal
            ? `Over by ${CURRENCY_SYMBOL}${categoryAllocations.diff.toLocaleString('en-IN')}`
            : `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} capped • ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')} flexible pool`}
        </span>
      </div>

      <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden flex">
        {categoryAllocations.isOverTotal ? (
          <div
            className="h-full w-full bg-destructive animate-pulse"
            title="Allocations exceed total budget"
          />
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
                title={`Flexible group pool: ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')} (${unallocatedPct.toFixed(0)}%)`}
              />
            )}
          </>
        )}
      </div>

      {categoryAllocations.isOverTotal && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <span className="text-[11px]">Category caps exceed monthly limit.</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleAutoSumFromCategories}
            className="h-6 px-2 text-[11px]"
          >
            Sync to {CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')}
          </Button>
        </div>
      )}

      {categoryAllocations.list.length > 0 && !categoryAllocations.isOverTotal && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[10px] text-muted-foreground">
          {categoryAllocations.list.map((item) => (
            <div key={item.cat.key} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.cat.color }}
              />
              <span>{item.cat.name}</span>
              <span className="font-mono text-muted-foreground/70">({item.pctOfTotal.toFixed(0)}%)</span>
            </div>
          ))}
          {unallocatedAmount > 0 && currentTotal > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground/80 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span>Flexible Pool ({unallocatedPct.toFixed(0)}%)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Main Form View (Left Pane) ──
  const MainView = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="space-y-4 pb-2">
          {/* Enable / Disable Switch */}
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md bg-muted/20 border border-border/30 p-3 space-y-0">
                <div>
                  <FormLabel className="text-sm font-medium">Monthly budget tracking</FormLabel>
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
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    Total Monthly Budget
                  </FormLabel>
                  {categoryAllocations.sum > 0 && categoryAllocations.sum !== currentTotal && (
                    <button
                      type="button"
                      onClick={handleAutoSumFromCategories}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline"
                    >
                      <Icons.Sparkles className="h-3 w-3" />
                      Sum ({CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')})
                    </button>
                  )}
                </div>

                <div className="relative flex items-baseline border-b-2 border-border/40 hover:border-primary/60 focus-within:border-primary transition-colors pb-1">
                  <span className="text-[clamp(1.75rem,7vw,2.5rem)] font-semibold text-muted-foreground align-baseline leading-none">
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
                      className="pl-2 text-[clamp(1.75rem,7vw,2.5rem)] leading-none font-semibold border-none !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent !focus-visible:bg-transparent shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 hide-number-arrows"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs" />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={currentTotal === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue('monthlyLimit', preset, { shouldValidate: true })}
                      className={cn(
                        'h-7 text-xs px-2.5',
                        currentTotal === preset && 'font-semibold'
                      )}
                    >
                      {CURRENCY_SYMBOL}{preset.toLocaleString('en-IN')}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}
          />

          {/* Visual Allocation Meter (Conditionally rendered) */}
          {showDistributionGraph && DistributionMeter}

          {/* ── Category Wise Budget Expander Trigger (Sideways expansion) ── */}
          <div className="space-y-1">
            <FormLabel className="text-xs font-medium text-muted-foreground block">
              Category Allocation
            </FormLabel>
            <button
              type="button"
              onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-md border text-left transition-colors',
                isCategoryExpanded
                  ? 'bg-muted/40 border-border/60 text-foreground'
                  : 'bg-muted/20 border-border/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-md bg-muted text-foreground">
                  <Icons.PieChart className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <span>Category Caps</span>
                    {categoryAllocations.list.length > 0 && (
                      <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                        {categoryAllocations.list.length} active
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {categoryAllocations.list.length > 0
                      ? `${CURRENCY_SYMBOL}${categoryAllocations.sum.toLocaleString('en-IN')} capped • ${CURRENCY_SYMBOL}${unallocatedAmount.toLocaleString('en-IN')} flexible pool`
                      : 'Optional caps per category • All expenses share the budget'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-foreground shrink-0 pl-2">
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
            <FormLabel className="text-xs font-medium text-muted-foreground block">
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
                        'flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-medium cursor-pointer transition-colors select-none',
                        field.value
                          ? 'bg-muted/60 text-foreground border-border/60 font-semibold'
                          : 'bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-border text-foreground focus:ring-ring h-3.5 w-3.5"
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
      <DialogFooter className="p-6 pt-3 flex items-center justify-between border-t border-border/20 bg-background">
        {initialBudget?.monthlyLimit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDisableBudget}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="set-budget-form"
            disabled={isSubmitting || categoryAllocations.isOverTotal}
          >
            {isSubmitting ? 'Saving...' : 'Save Budget'}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );

  // ── Expanded Category View (Right Pane on Desktop, Slide-in on Mobile) ──
  const CategoryExpandedPane = (
    <div className="flex flex-col h-full bg-background">
      {/* Pane Header (Desktop only since mobile uses SheetHeader) */}
      {!isMobile && (
        <div className="p-4 px-6 border-b border-border/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted text-foreground">
              <Icons.PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Category Caps</h3>
              <p className="text-[11px] text-muted-foreground">
                {categoryAllocations.list.length} of {MASTER_CATEGORIES.length} allocated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {categoryAllocations.list.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const emptyCats = Object.fromEntries(MASTER_CATEGORIES.map((c) => [c.key, '']));
                  form.setValue('categories', emptyCats);
                }}
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
              >
                Clear All
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCategoryExpanded(false)}
              className="h-7 w-7 rounded-md hover:bg-muted"
              title="Collapse panel"
            >
              <Icons.Close className="h-4 w-4" />
              <span className="sr-only">Close category panel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Category List */}
      <ScrollArea className="flex-1 px-6 py-3 overflow-y-auto">
        <div className="space-y-2.5 pb-2">
          {/* Top Live Distribution Meter inside category pane */}
          {DistributionMeter}

          {/* Micro Explainer Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/20 border border-border/20 text-xs text-muted-foreground">
            <Icons.Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Category caps are optional. Any unallocated amount stays in your <span className="font-medium text-foreground">flexible group pool</span> for other expenses.
            </p>
          </div>

          {/* Category Input Rows */}
          <div className="divide-y divide-border/20 pt-1">
            {MASTER_CATEGORIES.map((cat) => {
              const IconComp = Icons[cat.icon] || Icons.Wallet;
              const currentVal = form.watch(`categories.${cat.key}`) || '';
              const numVal = Number(currentVal) || 0;
              const pct = currentTotal > 0 && numVal > 0 ? (numVal / currentTotal) * 100 : 0;

              return (
                <div
                  key={cat.key}
                  className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 rounded-md bg-muted/60 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                      {pct > 0 ? (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {pct.toFixed(0)}% of budget
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/60">No cap</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      {CURRENCY_SYMBOL}
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={currentVal}
                      onChange={(e) => {
                        form.setValue(`categories.${cat.key}`, e.target.value);
                      }}
                      className="h-8 w-24 text-sm px-2 text-right rounded-md bg-muted/20 border-border/30 hover:bg-background focus:bg-background text-foreground font-medium hide-number-arrows"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Pane Footer Summary */}
      <div className="p-4 px-6 border-t border-border/30 bg-background flex items-center justify-between text-xs shrink-0">
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground">Total Capped</p>
          <p className="text-sm font-semibold text-foreground font-mono">
            {CURRENCY_SYMBOL}{categoryAllocations.sum.toLocaleString('en-IN')}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {CURRENCY_SYMBOL}{currentTotal.toLocaleString('en-IN')}
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsCategoryExpanded(false)}
          className="h-8 px-3 gap-1.5 font-medium"
        >
          {isMobile ? (
            <>
              <Icons.ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Budget</span>
            </>
          ) : (
            'Done'
          )}
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
            className="overflow-hidden flex flex-col border-l border-border/30 bg-background"
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
          <SheetHeader className="p-4 border-b border-border/20 text-left shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {isCategoryExpanded && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCategoryExpanded(false)}
                  className="h-8 w-8 rounded-md hover:bg-muted shrink-0"
                  title="Back to monthly budget"
                >
                  <Icons.ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <SheetTitle className="text-lg font-bold font-headline flex items-center gap-2 truncate">
                <Icons.Currency className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>{isCategoryExpanded ? 'Category Caps' : 'Monthly Budget'}</span>
              </SheetTitle>
            </div>
            {isCategoryExpanded && categoryAllocations.list.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const emptyCats = Object.fromEntries(MASTER_CATEGORIES.map((c) => [c.key, '']));
                  form.setValue('categories', emptyCats);
                }}
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2 shrink-0"
              >
                Clear All
              </Button>
            )}
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
          <DialogTitle className="text-lg font-bold font-headline flex items-center gap-2">
            <Icons.Currency className="h-5 w-5 text-muted-foreground" />
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
