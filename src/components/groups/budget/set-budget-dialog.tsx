'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { updateGroup } from '@/lib/firestore.service';
import { useAuth } from '@/contexts/auth-context';
import { appEventEmitter } from '@/lib/event-emitter';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { defaultExpenseCategories } from '@/lib/expense-categories';
import type { Group, GroupBudget } from '@/types';
import { cn } from '@/lib/utils';

const budgetSchema = z.object({
  monthlyLimit: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: 'Please enter a budget amount.' }).min(100, 'Minimum budget is ₹100').max(10000000, 'Budget too high')
  ),
  enabled: z.boolean().default(true),
  threshold75: z.boolean().default(true),
  threshold90: z.boolean().default(true),
  threshold100: z.boolean().default(true),
  categories: z.record(z.string(), z.string()).optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

const QUICK_PRESETS = [10000, 25000, 50000, 100000];

interface SetBudgetDialogProps {
  group: Group;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SetBudgetDialog({ group, trigger, open: controlledOpen, onOpenChange }: SetBudgetDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

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

  // Re-sync when group updates or dialog opens
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

  const masterCategoryKeys = Object.keys(defaultExpenseCategories);

  async function onSubmit(values: BudgetFormValues) {
    if (!userProfile) return;
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
        monthlyLimit: Number(values.monthlyLimit),
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
          ? `Monthly budget set to ${CURRENCY_SYMBOL}${Number(values.monthlyLimit).toLocaleString('en-IN')}.`
          : 'Monthly budget has been disabled.',
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
      toast({ title: 'Budget Disabled', description: 'Group budget tracking has been turned off.' });
      appEventEmitter.emit('data-changed');
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to remove budget.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
        <div className="p-6 pb-2 border-b border-border/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Icons.Currency className="h-5 w-5 text-primary" />
              Monthly Group Budget
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a monthly spending target for {group.name} to track pace and daily allowances.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-2 space-y-5">
            {/* Enable/Disable Toggle */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 p-3.5 space-y-0">
                  <div>
                    <FormLabel className="text-sm font-medium">Enable Budget Tracking</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      Calculate burn rates and safe limits
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
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Monthly Budget Target
                  </FormLabel>
                  <div className="flex items-baseline gap-1 border-b-2 border-border/40 focus-within:border-primary transition-colors pb-1">
                    <span className="text-2xl font-bold text-muted-foreground">{CURRENCY_SYMBOL}</span>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25000"
                        {...field}
                        value={field.value ?? ''}
                        className="text-[clamp(2rem,6vw,2.75rem)] font-bold text-foreground border-none !bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />

                  {/* Preset Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('monthlyLimit', preset, { shouldValidate: true })}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border',
                          form.watch('monthlyLimit') === preset
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

            {/* Notification Thresholds */}
            <div className="space-y-2 rounded-xl bg-muted/20 border border-border/30 p-3.5">
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Alert Thresholds
              </FormLabel>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { name: 'threshold75', label: '75% Caution' },
                  { name: 'threshold90', label: '90% Warning' },
                  { name: 'threshold100', label: '100% Limit' },
                ].map((t) => (
                  <FormField
                    key={t.name}
                    control={form.control}
                    name={t.name as any}
                    render={({ field }) => (
                      <label
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                          field.value
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-background/50 text-muted-foreground border-border/40 hover:bg-muted/40'
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

            {/* Optional Category Allocations */}
            <Accordion type="single" collapsible className="border border-border/30 rounded-xl px-3.5 bg-muted/10">
              <AccordionItem value="categories" className="border-none">
                <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icons.PieChart className="h-4 w-4 text-primary" />
                    <span>Category Allocations (Optional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3 space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    Set target limits for specific categories to detect category spikes early.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {masterCategoryKeys.slice(0, 8).map((cat) => (
                      <div key={cat} className="flex items-center gap-2 bg-background/60 p-2 rounded-lg border border-border/30">
                        <span className="text-xs font-medium truncate flex-1">{cat}</span>
                        <div className="flex items-center gap-1 w-24">
                          <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={form.watch(`categories.${cat}`) || ''}
                            onChange={(e) => form.setValue(`categories.${cat}`, e.target.value)}
                            className="h-7 text-xs px-1.5 text-right rounded-md bg-muted/30"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Action Buttons */}
            <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2 border-t border-border/20 gap-2">
              {initialBudget?.monthlyLimit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisableBudget}
                  disabled={isSubmitting}
                  className="h-10 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-3 rounded-xl"
                >
                  Disable Budget
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="h-10 rounded-xl text-sm font-medium px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl text-sm font-medium px-5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Budget'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
