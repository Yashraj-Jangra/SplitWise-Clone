
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
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
import { Icons } from '@/components/icons';
import type { Group } from '@/types';
import { cn, getFullName, getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getMasterCategory } from '@/lib/expense-categories';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

interface ExpenseFormProps {
  group: Group;
}

export function ExpenseForm({ group }: ExpenseFormProps) {
  const { control, watch, getValues } = useFormContext();
  const { settings } = useSiteSettings();
  
  const watchPayerType = watch('payerType');
  const watchSplitType = watch('splitType');
  const watchParticipants = watch('participants');
  
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
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
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
      
      {watchPayerType === 'single' ? (
          <FormField control={control} name="singlePayerId" render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select who paid..." /></SelectTrigger></FormControl>
                <SelectContent>{group.members.map(m => <SelectItem key={m.uid} value={m.uid}>{getFullName(m.firstName, m.lastName)}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
      ) : (
        <div className="space-y-2">
          {getValues('multiPayers')?.map((_: any, index: number) => (
            <FormField key={index} control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormLabel className="font-normal w-1/2">{getValues(`multiPayers.${index}.name`)}</FormLabel>
                <div className="relative w-1/2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)} className="pl-6"/></div>
              </FormItem>
            ))} />
          ))}
          <FormMessage>{(getValues('formState.errors') as any)?.multiPayers?.message}</FormMessage>
        </div>
      )}
      
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
                {watchParticipants && watchParticipants.map((p: any, index: number) => (
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
        <FormMessage>{(getValues('formState.errors') as any)?.participants?.message}</FormMessage>
      </div>

       <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Any extra details about the expense." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
