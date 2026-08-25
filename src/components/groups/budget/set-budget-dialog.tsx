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
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border border-border rounded-xl shadow-xl bg-card">
        <div className="p-4 border-b border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Icons.Currency className="h-4 w-4 text-foreground/80" />
              Monthly Group Budget
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Configure spending targets and alert benchmarks for {group.name}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
            {/* Enable/Disable Toggle */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3 space-y-0">
                  <div>
                    <FormLabel className="text-xs font-bold text-foreground">Enable Budget Tracking</FormLabel>
                    <FormDescription className="text-[11px] text-muted-foreground">
                      Track spending velocity and safe burn rates
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
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Target
                  </FormLabel>
                  <div className="flex items-baseline gap-1 border-b border-border focus-within:border-foreground transition-colors pb-1">
                    <span className="text-2xl font-bold font-mono text-muted-foreground">{CURRENCY_SYMBOL}</span>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25000"
                        {...field}
                        value={field.value ?? ''}
                        className="text-3xl font-black font-mono tracking-tight text-foreground border-none !bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />

                  {/* Preset Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('monthlyLimit', preset, { shouldValidate: true })}
                        className={cn(
                          'px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-colors border',
                          form.watch('monthlyLimit') === preset
                            ? 'bg-foreground text-background border-foreground font-bold'
                            : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
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
            <div className="space-y-2 rounded-lg bg-muted/30 border border-border p-3">
              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Alert Thresholds
              </FormLabel>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
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
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors select-none',
                          field.value
                            ? 'bg-muted text-foreground border-foreground/40 font-semibold'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted/30'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-border text-foreground focus:ring-0 h-3.5 w-3.5"
                        />
                        <span>{t.label}</span>
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Optional Category Allocations */}
            <Accordion type="single" collapsible className="border border-border rounded-lg px-3 bg-muted/20">
              <AccordionItem value="categories" className="border-none">
                <AccordionTrigger className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 hover:no-underline">
                  <div className="flex items-center gap-1.5">
                    <Icons.PieChart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Category Allocations (Optional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Set target caps for specific categories to detect spikes.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {masterCategoryKeys.slice(0, 8).map((cat) => (
                      <div key={cat} className="flex items-center gap-1.5 bg-background p-1.5 rounded-md border border-border">
                        <span className="text-xs font-medium truncate flex-1">{cat}</span>
                        <div className="flex items-center gap-1 w-20">
                          <span className="text-xs text-muted-foreground font-mono">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={form.watch(`categories.${cat}`) || ''}
                            onChange={(e) => form.setValue(`categories.${cat}`, e.target.value)}
                            className="h-6 text-xs font-mono px-1 text-right rounded bg-muted/30 border-border"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Action Buttons */}
            <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-3 border-t border-border gap-2">
              {initialBudget?.monthlyLimit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisableBudget}
                  disabled={isSubmitting}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2 rounded-md"
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
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 rounded-md text-xs font-bold uppercase tracking-wider px-3 border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 rounded-md text-xs font-bold uppercase tracking-wider px-4"
                >
                  {isSubmitting ? 'Saving...' : 'Save Target'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
