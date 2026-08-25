'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { updateGroup } from '@/lib/firestore.service';
import { useAuth } from '@/contexts/auth-context';
import { appEventEmitter } from '@/lib/event-emitter';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { defaultExpenseCategories } from '@/lib/expense-categories';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Group, GroupBudget } from '@/types';
import { cn } from '@/lib/utils';

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

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize} className="gap-1.5 font-medium rounded-xl">
      <Icons.Currency className="h-4 w-4" />
      <span>{initialBudget?.enabled ? 'Edit Budget' : 'Set Budget'}</span>
    </Button>
  );

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Enable / Disable Switch */}
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/40 p-3 space-y-0">
              <div>
                <FormLabel className="text-sm font-medium">Enable monthly tracking</FormLabel>
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
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Spending Limit
              </FormLabel>
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

        {/* Alert Thresholds */}
        <div className="space-y-1.5 pt-1">
          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Alert Benchmarks
          </FormLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'threshold75', label: '75% Warning' },
              { name: 'threshold90', label: '90% Caution' },
              { name: 'threshold100', label: '100% Limit' },
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

        {/* Category Allocations Accordion */}
        <Accordion type="single" collapsible className="border border-border/30 rounded-xl px-3 bg-muted/10">
          <AccordionItem value="categories" className="border-none">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 hover:no-underline">
              <div className="flex items-center gap-2">
                <Icons.PieChart className="h-4 w-4 text-primary" />
                <span>Category Limits (Optional)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Set spending targets for specific categories.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {masterCategoryKeys.slice(0, 8).map((cat) => (
                  <div key={cat} className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/30">
                    <span className="text-xs font-medium truncate flex-1">{cat}</span>
                    <div className="flex items-center gap-1 w-20">
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20 gap-2">
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
              disabled={isSubmitting}
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
        <SheetContent side="bottom" className="h-auto max-h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-6 bg-background overflow-y-auto">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Icons.Currency className="h-5 w-5 text-primary" />
              Monthly Budget
            </SheetTitle>
          </SheetHeader>
          {formBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[460px] p-6 border-border/20 rounded-2xl shadow-2xl bg-background">
        <DialogHeader className="mb-2 text-left">
          <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
            <Icons.Currency className="h-5 w-5 text-primary" />
            Monthly Budget
          </DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
