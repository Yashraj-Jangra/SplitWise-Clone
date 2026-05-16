
'use client';

import * as React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn, getFullName, getInitials } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { classifyExpense, getMasterCategory } from '@/lib/expense-categories';
import { Icons } from '@/components/icons';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import { appEventEmitter } from '@/lib/event-emitter';
import { addExpense, updateExpense } from '@/lib/mock-data';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import { useDebounce } from '@/hooks/use-debounce';

// UI Components
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem
} from '@/components/ui/command';

// Icons
import { X, ArrowLeft } from 'lucide-react';

// Types
import type { Group, Expense, UserProfile } from '@/types';

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
      percentage: z.coerce.number().min(0, 'Percentage cannot be negative').optional(),
    })
  ).min(1, 'At least one participant is required.').refine((arr) => arr.some((p) => p.selected), {
    message: 'At least one participant must be selected.',
    path: ['-'],
  }),
  category: z.string({ required_error: 'Category is required.' }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

function MainExpenseForm({ setView, group, setValue, userOverriddenCategory, setUserOverriddenCategory }: { setView: (view: 'main' | 'split' | 'payer') => void; group: Group, setValue: any, userOverriddenCategory: boolean, setUserOverriddenCategory: (value: boolean) => void }) {
  const { control, watch, formState: { dirtyFields } } = useFormContext<ExpenseFormValues>();
  const { userProfile } = useAuth();
  const { settings } = useSiteSettings();

  const watchAmount = watch('amount');
  const watchPayerType = watch('payerType');
  const watchSinglePayerId = watch('singlePayerId');
  const watchMultiPayers = watch('multiPayers');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
  const watchCategory = watch('category');
  const watchDescription = watch('description');

  const debouncedDescription = useDebounce(watchDescription, 300);

  // Effect for auto-categorization
  React.useEffect(() => {
    if (debouncedDescription && !userOverriddenCategory) {
      const { sub: predictedSubCategory } = classifyExpense(debouncedDescription, settings.expenseCategories);
      if (predictedSubCategory) {
        setValue('category', predictedSubCategory, { shouldDirty: false }); // Set shouldDirty to false
      }
    }
  }, [debouncedDescription, settings.expenseCategories, setValue, userOverriddenCategory]);


  const { CategoryIcon } = React.useMemo(() => {
    if (!settings.expenseCategories || !watchCategory) {
      return { CategoryIcon: Icons.Wallet };
    }
    const masterCategory = getMasterCategory(watchCategory, settings.expenseCategories);
    if (!masterCategory || !settings.expenseCategories[masterCategory]?.subCategories?.[watchCategory]) {
      return { CategoryIcon: Icons.Wallet };
    }
    const iconName = settings.expenseCategories[masterCategory].subCategories[watchCategory].icon || 'Wallet';
    const IconComponent = Icons[iconName] || Icons.Wallet;
    return { CategoryIcon: IconComponent };
  }, [watchCategory, settings.expenseCategories]);

  const selectedParticipants = watchParticipants?.filter((p: any) => p.selected) || [];

  const handleParticipantSelection = (userId: string, isSelected: boolean) => {
    const updatedParticipants = watchParticipants.map((p: any) =>
      p.userId === userId ? { ...p, selected: isSelected } : p
    );
    setValue('participants', updatedParticipants, { shouldValidate: true });
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
                    <button tabIndex={-1} type="button" role="combobox" className="h-auto p-0 flex flex-col items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md">
                      <div className="flex-shrink-0 p-3 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                        <CategoryIcon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-xs text-muted-foreground">{field.value}</span>
                    </button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command className="max-h-80">
                    <CommandInput placeholder="Search category..." />
                    <CommandList onWheel={(e) => e.stopPropagation()}>
                      <CommandEmpty>No category found.</CommandEmpty>
                      {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                        <CommandGroup key={masterCat} heading={masterCat}>
                          {details && details.subCategories && Object.keys(details.subCategories).map((subCat) => {
                            const subDetails = details.subCategories[subCat];
                            const Icon = subDetails?.icon ? (Icons[subDetails.icon] || Icons.Wallet) : Icons.Wallet;
                            return (
                              <CommandItem
                                value={subCat}
                                key={subCat}
                                onSelect={() => {
                                  setValue('category', subCat);
                                  setUserOverriddenCategory(true);
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
                  <Input placeholder="Description" {...field} className="text-lg font-semibold border-x-0 border-t-0 rounded-none border-b-2 bg-transparent shadow-none px-0 focus:border-primary h-auto focus-visible:ring-0 focus-visible:ring-offset-0" />
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
                    <span className="text-4xl font-bold text-muted-foreground align-baseline">
                      {CURRENCY_SYMBOL}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      className="pl-2 text-4xl font-bold border-x-0 border-t-0 rounded-none border-b-2 bg-transparent shadow-none px-0 focus:border-primary h-auto focus-visible:ring-0 focus-visible:ring-offset-0 hide-number-arrows"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm">Paid by <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setView('payer')}>{paidByText}</Button> and split <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setView('split')}>{splitText}</Button>.</p>
        <p className="text-xs text-muted-foreground">({getSummaryText()})</p>
      </div>

      <div className="flex flex-row items-start gap-2">
        <p className="text-sm mt-1.5 flex-shrink-0">With:</p>
        <div className="flex-1 flex flex-wrap items-center gap-1">
          {selectedParticipants.map((p: any) => (
            <Badge key={p.userId} variant="secondary" className="pl-2 pr-1">
              {p.name}
              <button type="button" onClick={() => handleParticipantSelection(p.userId, false)} className="ml-1 rounded-full hover:bg-destructive/20">
                <X className="h-3 w-3 text-destructive" />
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
                      type="button"
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

export function PayerView({ setView, group }: { setView: (view: 'main') => void, group: Group }) {
  const { control, watch, formState: { errors } } = useFormContext();
  const watchPayerType = watch('payerType');
  const watchMultiPayers = watch('multiPayers');
  const watchAmount = watch('amount');
  const totalAmount = parseFloat(watchAmount) || 0;

  let sumOfPaid = 0;
  if (watchPayerType === 'multiple') {
    sumOfPaid = watchMultiPayers.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0);
  }
  const remaining = totalAmount - sumOfPaid;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setView('main')}>
          <ArrowLeft />
        </Button>
        <div>
          <DialogTitle>Who paid?</DialogTitle>
        </div>
      </header>

      <FormField
        control={control}
        name="payerType"
        render={({ field }) => (
          <ToggleGroup
            type="single"
            className="grid w-full grid-cols-2"
            value={field.value}
            onValueChange={(v) => { if (v) field.onChange(v as any) }}
          >
            <ToggleGroupItem value="single" aria-label="Single Person" data-state={field.value === 'single' ? 'on' : 'off'}>Single Person</ToggleGroupItem>
            <ToggleGroupItem value="multiple" aria-label="Multiple People" data-state={field.value === 'multiple' ? 'on' : 'off'}>Multiple People</ToggleGroupItem>
          </ToggleGroup>
        )}
      />

      {watchPayerType === 'single' ? (
        <FormField
          control={control}
          name="singlePayerId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 gap-2"
                >
                  {group.members.map(member => (
                    <FormItem key={member.uid} className="flex-1">
                      <FormControl>
                        <Button
                          asChild
                          type="button"
                          variant={field.value === member.uid ? 'default' : 'outline'}
                          className="w-full h-auto p-2 justify-start cursor-pointer"
                        >
                          <label>
                            <RadioGroupItem value={member.uid} className="sr-only" />
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatarUrl} />
                                <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{getFullName(member.firstName, member.lastName)}</span>
                            </div>
                          </label>
                        </Button>
                      </FormControl>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <div className="space-y-2">
          <p className="font-semibold">Enter amounts paid</p>
          <ScrollArea className="h-64">
            <div className="p-1 space-y-1">
              {watchMultiPayers && watchMultiPayers.map((p: any, index: number) => (
                <div key={p.userId} className="flex items-center gap-3 p-2 rounded-md">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
                  <div className="w-28">
                    <FormField control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (<Input type="number" {...field} placeholder="0.00" value={field.value === undefined ? '' : field.value} />)} />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <FormMessage>{(errors as any)?.multiPayers?.message}</FormMessage>
          <div className="flex items-center justify-between font-bold text-lg p-2 bg-muted rounded-md">
            <p>TOTAL</p>
            <div>
              <p>{CURRENCY_SYMBOL}{totalAmount.toFixed(2)}</p>
              <p className={cn("text-xs font-normal text-right", Math.abs(remaining) > 0.01 ? 'text-destructive' : 'text-green-500')}>{CURRENCY_SYMBOL}{Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'left' : 'over'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SplitView({ setView }: { setView: (view: 'main') => void }) {
  const { control, watch, formState: { errors } } = useFormContext();
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
  const watchAmount = watch('amount');

  const totalAmount = parseFloat(watchAmount) || 0;

  let sumOfSplit = 0;
  if (watchSplitType === 'unequally') {
    sumOfSplit = watchParticipants.filter((p: any) => p.selected).reduce((acc: number, p: any) => acc + (parseFloat(p.amountOwed) || 0), 0);
  } else if (watchSplitType === 'by_percentage') {
    sumOfSplit = watchParticipants.filter((p: any) => p.selected).reduce((acc: number, p: any) => acc + (parseFloat(p.percentage) || 0), 0);
  } else if (watchSplitType === 'by_shares') {
    sumOfSplit = watchParticipants.filter((p: any) => p.selected).reduce((acc: number, p: any) => acc + (Number(p.shares) || 0), 0);
  }

  const remaining = totalAmount - sumOfSplit;
  const remainingPercentage = 100 - sumOfSplit;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setView('main')}>
          <ArrowLeft />
        </Button>
        <div>
          <DialogTitle>Choose split options</DialogTitle>
        </div>
      </header>

      <FormField
        control={control}
        name="splitType"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <ToggleGroup
                type="single"
                className="grid w-full grid-cols-4"
                value={field.value}
                onValueChange={(v) => { if (v) field.onChange(v as any) }}
              >
                <ToggleGroupItem value="equally" aria-label="Split equally" data-state={field.value === 'equally' ? 'on' : 'off'}> <Icons.Baseline className="h-5 w-5" /></ToggleGroupItem>
                <ToggleGroupItem value="unequally" aria-label="Split unequally" data-state={field.value === 'unequally' ? 'on' : 'off'}>1.23</ToggleGroupItem>
                <ToggleGroupItem value="by_percentage" aria-label="Split by percentage" data-state={field.value === 'by_percentage' ? 'on' : 'off'}>%</ToggleGroupItem>
                <ToggleGroupItem value="by_shares" aria-label="Split by shares" data-state={field.value === 'by_shares' ? 'on' : 'off'}>+/-</ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <p className="font-semibold capitalize">Split {watchSplitType.replace('_', ' ')}</p>
        <ScrollArea className="h-64">
          <div className="p-1 space-y-1">
            {watchParticipants && watchParticipants.map((p: any, index: number) => (
              <div key={p.userId} className="flex items-center justify-between p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <FormField
                    control={control}
                    name={`participants.${index}.selected`}
                    render={({ field }) => (
                      <FormItem className="flex items-center">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm truncate">{p.name}</span>
                </div>

                {p.selected && (
                  <div className="w-32 relative">
                    {watchSplitType === 'equally' && (
                      <Input type="number" disabled value={(p.amountOwed || 0).toFixed(2)} />
                    )}
                    {watchSplitType === 'unequally' && (
                      <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => (<Input type="number" {...field} className="hide-number-arrows" placeholder="0.00" value={field.value === undefined ? '' : field.value} />)} />
                    )}
                    {watchSplitType === 'by_shares' && (
                      <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => (<Input type="number" {...field} placeholder="1" className="hide-number-arrows" value={field.value === undefined ? '' : field.value} />)} />
                    )}
                    {watchSplitType === 'by_percentage' && (
                      <div className="relative">
                        <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => (<Input type="number" {...field} className="pr-8 hide-number-arrows" placeholder="0" value={field.value === undefined ? '' : field.value} />)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <FormMessage>{(errors as any)?.participants?.message}</FormMessage>
      </div>

      <div className="flex items-center justify-between font-bold text-lg p-2 bg-muted rounded-md">
        <p>TOTAL</p>
        <div>
          {watchSplitType !== 'by_percentage' ? (
            <>
              <p>{CURRENCY_SYMBOL}{totalAmount.toFixed(2)}</p>
              {watchSplitType === 'unequally' && (
                <p className={cn("text-xs font-normal text-right", Math.abs(remaining) > 0.01 ? 'text-destructive' : 'text-green-500')}>{CURRENCY_SYMBOL}{Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'left' : 'over'}</p>
              )}
              {watchSplitType === 'by_shares' && (
                <p className="text-xs font-normal text-right text-muted-foreground">{sumOfSplit} {sumOfSplit === 1 ? 'share' : 'shares'}</p>
              )}
            </>
          ) : (
            <>
              <p>{sumOfSplit.toFixed(2)}%</p>
              <p className={cn("text-xs font-normal text-right", Math.abs(remainingPercentage) > 0.01 ? 'text-destructive' : 'text-green-500')}>{remainingPercentage.toFixed(2)}% left</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ExpenseFormProps {
  group: Group;
  userProfile: UserProfile;
  isEditing: boolean;
  expenseToEdit?: Expense;
  onClose: () => void;
}

export function ExpenseForm({ group, userProfile, isEditing, expenseToEdit, onClose }: ExpenseFormProps) {
  const [view, setView] = React.useState<'main' | 'split' | 'payer'>('main');
  const [userOverriddenCategory, setUserOverriddenCategory] = React.useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  const { reset, watch, setValue, getValues, formState, trigger } = form;

  const watchedAmount = watch('amount');
  const watchedSplitType = watch('splitType');
  const watchedParticipants = watch('participants');

  const participantDeps = React.useMemo(() => {
    if (!watchedParticipants) return null;
    return JSON.stringify(
      watchedParticipants.map(p => ({
        userId: p.userId,
        selected: p.selected,
        shares: p.shares,
        percentage: p.percentage
      }))
    );
  }, [watchedParticipants]);

  const calculateSplits = React.useCallback(() => {
    const allParticipants = getValues('participants') || [];
    const splitType = getValues('splitType');
    const totalAmount = Number(getValues('amount')) || 0;

    const selectedParticipants = allParticipants.filter((p: any) => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
      allParticipants.forEach((_: any, index: number) => {
        setValue(`participants.${index}.amountOwed`, 0, { shouldDirty: true });
      });
      return;
    }

    let amounts: number[] = [];

    if (splitType === 'equally') {
      amounts = Array(numSelected).fill(totalAmount / numSelected);
    } else if (splitType === 'by_shares') {
      const totalShares = selectedParticipants.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
      if (totalShares > 0) {
        amounts = selectedParticipants.map(p => (totalAmount * (Number(p.shares) || 0)) / totalShares);
      } else {
        amounts = Array(numSelected).fill(0);
      }
    } else if (splitType === 'by_percentage') {
      amounts = selectedParticipants.map((p: any) => (totalAmount * (Number(p.percentage) || 0)) / 100);
    } else { // unequally
      return; // Don't auto-calculate for unequal split
    }

    if (amounts.length > 0) {
      // Correct for rounding errors
      const roundedAmounts = amounts.map(a => parseFloat(a.toFixed(2)));
      const sumOfRounded = roundedAmounts.reduce((s, a) => s + a, 0);
      let remainder = parseFloat((totalAmount - sumOfRounded).toFixed(2));

      if (Math.abs(remainder) > 0) {
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
          roundedAmounts[i % numSelected] += 0.01 * Math.sign(remainder);
        }
      }

      let roundedIndex = 0;
      allParticipants.forEach((p: any, index: number) => {
        if (p.selected) {
          setValue(`participants.${index}.amountOwed`, roundedAmounts[roundedIndex], { shouldDirty: true });
          roundedIndex++;
        } else {
          setValue(`participants.${index}.amountOwed`, 0, { shouldDirty: true });
        }
      });
    }
  }, [getValues, setValue]);

  React.useEffect(() => {
    if (watchedSplitType !== 'unequally') {
      calculateSplits();
    }
  }, [watchedAmount, watchedSplitType, participantDeps, calculateSplits]);


  React.useEffect(() => {
    if (isEditing && expenseToEdit && group) {
      const participantData = group.members.map((member) => {
        const existingParticipant = expenseToEdit.participants.find((p) => p.user.uid === member.uid);
        return {
          userId: member.uid,
          name: getFullName(member.firstName, member.lastName),
          avatarUrl: member.avatarUrl,
          selected: !!existingParticipant,
          amountOwed: existingParticipant?.amountOwed || 0,
          shares: existingParticipant?.share || 1,
          percentage: 0,
        };
      });

      if (expenseToEdit.splitType === 'by_percentage') {
        const totalAmount = expenseToEdit.amount;
        if (totalAmount > 0) {
          participantData.forEach((p) => {
            if (p.selected) {
              p.percentage = parseFloat(((p.amountOwed / totalAmount) * 100).toFixed(2));
            }
          });
        }
      }
      reset({
        description: expenseToEdit.description,
        amount: expenseToEdit.amount,
        date: new Date(expenseToEdit.date),
        notes: expenseToEdit.notes || '',
        payerType: expenseToEdit.payers.length > 1 ? 'multiple' : 'single',
        singlePayerId: expenseToEdit.payers.length === 1 ? expenseToEdit.payers[0].user.uid : userProfile?.uid,
        multiPayers: group.members.map((member) => ({
          userId: member.uid,
          name: getFullName(member.firstName, member.lastName),
          amount: expenseToEdit.payers.find((p) => p.user.uid === member.uid)?.amount,
        })),
        splitType: expenseToEdit.splitType,
        participants: participantData,
        category: expenseToEdit.category || 'Other',
      });
      setUserOverriddenCategory(true); // For edits, assume user is happy with the category
    } else if (!isEditing && userProfile && group) {
      reset({
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
      setUserOverriddenCategory(false);
    }
  }, [isEditing, expenseToEdit, group, userProfile, reset, setUserOverriddenCategory]);


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

    // --- Recalculate final participant data on submit to ensure accuracy ---
    const selectedParticipantsRaw = values.participants.filter(p => p.selected);
    const numSelected = selectedParticipantsRaw.length;
    let finalParticipants: { userId: string, amountOwed: number, share: number }[] = [];

    if (totalAmount > 0 && numSelected > 0) {
      let amounts: number[];

      if (values.splitType === 'by_shares') {
        const totalShares = selectedParticipantsRaw.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
        amounts = totalShares > 0
          ? selectedParticipantsRaw.map(p => (totalAmount * (Number(p.shares) || 0)) / totalShares)
          : Array(numSelected).fill(0);
      } else if (values.splitType === 'by_percentage') {
        amounts = selectedParticipantsRaw.map(p => (totalAmount * (Number(p.percentage) || 0)) / 100);
      } else if (values.splitType === 'unequally') {
        amounts = selectedParticipantsRaw.map(p => Number(p.amountOwed) || 0);
      } else { // 'equally'
        amounts = Array(numSelected).fill(totalAmount / numSelected);
      }

      // Correct for rounding errors
      const roundedAmounts = amounts.map(a => parseFloat(a.toFixed(2)));
      const sumOfRounded = roundedAmounts.reduce((s, a) => s + a, 0);
      let remainder = parseFloat((totalAmount - sumOfRounded).toFixed(2));

      if (Math.abs(remainder) > 0) {
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
          roundedAmounts[i % numSelected] += 0.01 * Math.sign(remainder);
        }
      }

      finalParticipants = selectedParticipantsRaw.map((p, i) => ({
        userId: p.userId,
        amountOwed: roundedAmounts[i],
        share: Number(p.shares) || 1
      }));
    }


    const payers = values.payerType === 'single' && values.singlePayerId
      ? [{ userId: values.singlePayerId, amount: values.amount }]
      : values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];

    try {
      if (isEditing && expenseToEdit) {
        await updateExpense(expenseToEdit.id, expenseToEdit.amount, {
          groupId: group.id,
          description: values.description,
          amount: totalAmount,
          date: values.date,
          notes: values.notes || '',
          payers,
          participants: finalParticipants,
          splitType: values.splitType,
          category: values.category,
          expenseCreatorId: expenseToEdit.expenseCreator.uid,
          groupCreatorId: group.createdBy.uid,
          createdAt: expenseToEdit.createdAt,
        }, userProfile.uid);
        toast({ title: 'Expense Updated!', description: `"${values.description}" has been successfully updated.` });
      } else {
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
      }
      appEventEmitter.emit('data-changed');
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : "An unknown error occurred.", variant: 'destructive' });
    }
  }

  const formId = isEditing ? 'edit-expense-form' : 'add-expense-form';

  const FormUI = (
    <div className={cn("flex w-full", isMobile ? "flex-col" : "flex-row")}>
      <div className="flex-shrink-0 w-full sm:w-[480px]">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="p-6">
              <MainExpenseForm group={group} setView={setView} setValue={setValue} userOverriddenCategory={userOverriddenCategory} setUserOverriddenCategory={setUserOverriddenCategory} />
            </form>
          </div>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} disabled={formState.isSubmitting}>
              {formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Expense')}
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
            <div className="flex-1">
              <ScrollArea className="h-full">
                <div className="p-6 h-full">
                  {view === 'split' && <SplitView setView={setView} />}
                  {view === 'payer' && <PayerView setView={setView} group={group} />}
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
      <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-center text-lg font-semibold">{isEditing ? 'Edit Expense' : 'New Expense'}</SheetTitle>
        </SheetHeader>
        <FormProvider {...form}>
          <ScrollArea className="flex-1">
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
              <div className="p-6">
                {view === 'split' ? <SplitView setView={setView} /> : view === 'payer' ? <PayerView setView={setView} group={group} /> : <MainExpenseForm group={group} setView={setView} setValue={setValue} userOverriddenCategory={userOverriddenCategory} setUserOverriddenCategory={setUserOverriddenCategory} />}
              </div>
            </form>
          </ScrollArea>
          {view === 'main' && (
            <SheetFooter className="p-4 bg-background/50 border-t">
              <Button form={formId} type="submit" disabled={formState.isSubmitting} className="w-full" size="lg">
                {formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Expense')}
              </Button>
            </SheetFooter>
          )}
        </FormProvider>
      </SheetContent>
    )
  }

  return (
    <DialogContent
      className={cn(
        "p-0 gap-0 transition-all duration-300 w-auto max-w-none",
        view !== 'main' ? "sm:w-[900px]" : "sm:w-[480px]"
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
  );
}
