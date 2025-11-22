
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getFullName, getInitials } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { getMasterCategory } from '@/lib/expense-categories';
import { Icons } from '@/components/icons';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
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
import type { Group } from '@/types';
import { X, ArrowLeft } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface ExpenseFormProps {
  group: Group;
  isEditing: boolean;
  view: 'main' | 'split' | 'payer';
  setView: (view: 'main' | 'split' | 'payer') => void;
}

export function ExpenseForm({ group, isEditing, view, setView }: ExpenseFormProps) {
  const { control, watch, setValue } = useFormContext();
  const { userProfile } = useAuth();
  const { settings } = useSiteSettings();

  const watchAmount = watch('amount');
  const watchPayerType = watch('payerType');
  const watchSinglePayerId = watch('singlePayerId');
  const watchMultiPayers = watch('multiPayers');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
  const watchCategory = watch('category');

  const masterCategory = getMasterCategory(watchCategory, settings.expenseCategories);
  const categoryDetails = settings.expenseCategories[masterCategory]?.subCategories?.[watchCategory];
  const CategoryIcon = (Icons as any)[categoryDetails?.icon || 'Wallet'] || Icons.Wallet;

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
          <div className="flex-shrink-0 p-4 bg-muted rounded-lg">
            <CategoryIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="w-full">
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Description" {...field} className="text-lg font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0" />
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
                          className="pl-2 text-4xl font-bold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 h-auto"
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
            render={() => (
                <Button type="button" variant="outline" className="w-full justify-start font-normal">
                    <Icons.Edit className="mr-2 h-4 w-4" />
                    Add image/notes
                </Button>
            )}
        />
      </div>

       <FormField
        control={control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-auto py-1 px-3 w-auto mx-auto bg-muted">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(settings.expenseCategories).map(([masterCat, details]) => (
                  <React.Fragment key={masterCat}>
                    {details && details.subCategories && (
                      <>
                        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {masterCat}
                        </p>
                        {Object.keys(details.subCategories).map((subCat) => {
                          const subDetails = details.subCategories[subCat];
                          const Icon = subDetails?.icon ? (Icons as any)[subDetails.icon] : Icons.Wallet;
                          return (
                            <SelectItem key={subCat} value={subCat}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{subCat}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

const SplitView = ({ setView }: { setView: (view: 'main') => void }) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
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
                <p className="text-xs font-normal text-muted-foreground text-right">{CURRENCY_SYMBOL}{Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'left' : 'over'}</p>
              </div>
            </div>

        </div>
    )
}
