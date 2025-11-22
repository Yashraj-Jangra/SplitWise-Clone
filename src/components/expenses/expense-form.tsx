
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getFullName, getInitials } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { getMasterCategory } from '@/lib/expense-categories';
import { Icons, IconName } from '@/components/icons';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import type { Group } from '@/types';
import { X, ArrowLeft, Search } from 'lucide-react';
import { DialogHeader, DialogTitle } from '../ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface ExpenseFormProps {
  group: Group;
  isEditing: boolean;
  view: 'main' | 'split' | 'payer';
  setView: (view: 'main' | 'split' | 'payer') => void;
}


function CategorySelector() {
    const { control, watch } = useFormContext();
    const { settings } = useSiteSettings();
    const [open, setOpen] = React.useState(false);

    const watchCategory = watch('category');

    const { categoryIconName, CategoryIcon } = React.useMemo(() => {
        const masterCategory = getMasterCategory(watchCategory, settings.expenseCategories);
        const iconName = settings.expenseCategories[masterCategory]?.subCategories?.[watchCategory]?.icon || 'Wallet';
        return {
            categoryIconName: iconName,
            CategoryIcon: (Icons as any)[iconName] || Icons.Wallet,
        };
    }, [watchCategory, settings.expenseCategories]);

    return (
        <FormField
            control={control}
            name="category"
            render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant="ghost" role="combobox" className="h-auto p-0 flex flex-col items-center gap-1">
                                    <div className="flex-shrink-0 p-4 bg-muted rounded-lg">
                                        <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{field.value}</span>
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                            <Command>
                                <CommandInput placeholder="Search category..." />
                                <CommandList>
                                    <CommandEmpty>No category found.</CommandEmpty>
                                    {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                                        <CommandGroup key={masterCat} heading={masterCat}>
                                            {details && details.subCategories && Object.keys(details.subCategories).map((subCat) => {
                                                const subDetails = details.subCategories[subCat];
                                                const Icon = subDetails?.icon ? (Icons as any)[subDetails.icon] : Icons.Wallet;
                                                return (
                                                    <CommandItem
                                                        value={subCat}
                                                        key={subCat}
                                                        onSelect={() => {
                                                            field.onChange(subCat);
                                                            setOpen(false);
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
    )
}


export function ExpenseForm({ group, isEditing, view, setView }: ExpenseFormProps) {
  const { control, watch, setValue } = useFormContext();
  const { userProfile } = useAuth();
  
  const watchAmount = watch('amount');
  const watchPayerType = watch('payerType');
  const watchSinglePayerId = watch('singlePayerId');
  const watchMultiPayers = watch('multiPayers');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');

  const selectedParticipants = watchParticipants?.filter((p: any) => p.selected) || [];

  const handleParticipantSelection = (userId: string, isSelected: boolean) => {
    const updatedParticipants = watchParticipants.map((p: any) =>
      p.userId === userId ? { ...p, selected: isSelected } : p
    );
    setValue('participants', updatedParticipants, { shouldValidate: true });
  };
  
  const getSummaryText = () => {
    if (!userProfile) return '';
    const userPaid = watchPayerType === 'single'
      ? (watchSinglePayerId === userProfile.uid ? watchAmount : 0)
      : watchMultiPayers?.find((p: any) => p.userId === userProfile.uid)?.amount || 0;
      
    const userOwed = watchParticipants?.find((p: any) => p.userId === userProfile.uid)?.amountOwed || 0;
    
    const net = userPaid - userOwed;
    if (Math.abs(net) < 0.01) return 'You are all square.';
    if (net > 0) return `You get back ${CURRENCY_SYMBOL}${net.toFixed(2)}`;
    return `You owe ${CURRENCY_SYMBOL}${Math.abs(net).toFixed(2)}`;
  };
  
  const paidByText = () => {
    if (watchPayerType === 'single') {
        const payer = group.members.find(m => m.uid === watchSinglePayerId);
        return payer ? getFullName(payer.firstName, payer.lastName) : '...';
    }
    const payers = watchMultiPayers?.filter((p: any) => p.amount > 0) || [];
    if (payers.length === 0) return 'no one';
    if (payers.length === 1) {
        const payer = group.members.find(m => m.uid === payers[0].userId);
        return payer ? getFullName(payer.firstName, payer.lastName) : '...';
    }
    return `${payers.length} people`;
  }
  
  const splitText = `split ${watchSplitType.replace('_', ' ')}`;

  if (view === 'payer') {
      return <PayerView setView={setView} group={group} />;
  }

  if (view === 'split') {
    return <SplitView setView={setView} />;
  }

  // Main View
  return (
    <div className="space-y-4">
      <DialogHeader className="mb-4">
        <DialogTitle>{isEditing ? 'Edit expense' : 'Add an expense'}</DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-4">
          <CategorySelector />
          <div className="w-full">
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Description" {...field} className="text-lg font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b transition-all duration-200" />
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
                        <span className="text-2xl font-bold text-muted-foreground">
                          {CURRENCY_SYMBOL}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          className="pl-2 text-4xl font-bold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b h-auto transition-all duration-200"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm">Paid by <Button variant="link" className="p-0 h-auto" onClick={() => setView('payer')}>{paidByText()}</Button> and {splitText}.</p>
        <p className="text-xs text-muted-foreground">({getSummaryText()})</p>
      </div>

      <div className="flex items-center gap-2">
        <FormField
            control={control}
            name="participants"
            render={() => (
                <div className="flex flex-wrap items-center gap-1">
                    <p className="text-sm mr-1">With:</p>
                    {selectedParticipants.map((p: any) => (
                        <Badge key={p.userId} variant="secondary" className="pl-2 pr-1">
                            {p.name}
                            <button type="button" onClick={() => handleParticipantSelection(p.userId, false)} className="ml-1 rounded-full hover:bg-destructive/50">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        />
         <Button type="button" variant="outline" size="sm" onClick={() => setView('split')}>Edit</Button>
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
                                {field.value ? "Edit notes" : "Add notes/image"}
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

const PayerView = ({ setView, group }: { setView: (view: 'main') => void, group: Group }) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('main')}>
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
                        onValueChange={(v) => { if(v) field.onChange(v as any) }}
                      >
                        <ToggleGroupItem value="single">Single Person</ToggleGroupItem>
                        <ToggleGroupItem value="multiple">Multiple People</ToggleGroupItem>
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
                                            variant={field.value === member.uid ? 'default' : 'outline'}
                                            className="w-full h-auto p-2 justify-start cursor-pointer"
                                        >
                                            <RadioGroupItem value={member.uid} className="sr-only" />
                                            <div className="flex items-center gap-2">
                                                 <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member.avatarUrl} />
                                                    <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{getFullName(member.firstName, member.lastName)}</span>
                                            </div>
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

const SplitView = ({ setView }: { setView: (view: 'main') => void }) => {
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
         sumOfSplit = watchParticipants.filter((p: any) => p.selected).reduce((acc: number, p: any) => acc + (parseFloat(p.shares) || 1), 0);
    }

    const remaining = totalAmount - sumOfSplit;

    return (
        <div className="space-y-4">
             <header className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('main')}>
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
                        defaultValue="equally"
                        className="grid w-full grid-cols-4"
                        value={field.value}
                        onValueChange={(v) => { if(v) field.onChange(v as any)}}
                      >
                        <ToggleGroupItem value="equally" aria-label="Split equally" > <Icons.Baseline className="h-5 w-5"/></ToggleGroupItem>
                        <ToggleGroupItem value="unequally" aria-label="Split unequally">1.23</ToggleGroupItem>
                        <ToggleGroupItem value="by_percentage" aria-label="Split by percentage">%</ToggleGroupItem>
                        <ToggleGroupItem value="by_shares" aria-label="Split by shares">+/-</ToggleGroupItem>
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
                          <div key={p.userId} className="flex items-center gap-3 p-2 rounded-md">
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
                            <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
                            {p.selected && (
                              <div className="w-28">
                                {watchSplitType === 'equally' && (
                                  <p className="text-sm text-right text-muted-foreground">
                                    {CURRENCY_SYMBOL}
                                    {(p.amountOwed || 0).toFixed(2)}
                                  </p>
                                )}
                                {watchSplitType === 'unequally' && (
                                  <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => (<Input type="number" {...field} />)} />
                                )}
                                {watchSplitType === 'by_shares' && (
                                  <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => (<Input type="number" {...field} />)} />
                                )}
                                {watchSplitType === 'by_percentage' && (
                                  <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => (<Input type="number" {...field} />)} />
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
                <p>{CURRENCY_SYMBOL}{totalAmount.toFixed(2)}</p>
                {(watchSplitType === 'unequally' || watchSplitType === 'by_percentage') && (
                    <p className={cn("text-xs font-normal text-right", Math.abs(remaining) > 0.01 ? 'text-destructive' : 'text-green-500')}>{CURRENCY_SYMBOL}{Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'left' : 'over'}</p>
                )}
                 {watchSplitType === 'by_shares' && (
                    <p className="text-xs font-normal text-right text-muted-foreground">{sumOfSplit} {sumOfSplit === 1 ? 'share' : 'shares'}</p>
                 )}
              </div>
            </div>

        </div>
    )
}

```
  </change>
  <change>
    <file>src/components/ui/command.tsx</file>
    <content><![CDATA[
"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
