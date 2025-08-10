
"use client";

import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Icons } from "@/components/icons";
import type { Group } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { classifyExpense, categoryList } from "@/lib/expense-categories";
import { getFullName, getInitials } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required." }),
  payerType: z.enum(['single', 'multiple']).default('single'),
  singlePayerId: z.string().optional(),
  multiPayers: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    amount: z.coerce.number().optional(),
  })).optional(),
  splitType: z.enum(["equally", "unequally", "by_shares", "by_percentage"]),
  participants: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
    selected: z.boolean(),
    amountOwed: z.coerce.number().optional(),
    shares: z.coerce.number().min(0, "Shares cannot be negative").optional(),
    percentage: z.coerce.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100").optional(),
  })).min(1, "At least one participant is required.")
   .refine(arr => arr.some(p => p.selected), { message: "At least one participant must be selected." }),
  category: z.string({ required_error: "Category is required." }),
}).superRefine((data, ctx) => {
    if (data.payerType === 'single') {
        if (!data.singlePayerId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A payer must be selected.",
                path: ["singlePayerId"]
            });
        }
    } else { // multiple
        const totalPaid = data.multiPayers?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        if (Math.abs(totalPaid - data.amount) > 0.01) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Payments (${CURRENCY_SYMBOL}${totalPaid.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${data.amount.toFixed(2)}).`,
                path: ["multiPayers"]
            });
        }
    }

    const totalAmount = Number(data.amount) || 0;
    const finalParticipants = data.participants.filter(p => p.selected);

     if(data.splitType === "unequally") {
        const sumOfOwedAmounts = finalParticipants.reduce((sum, p) => sum + (Number(p.amountOwed) || 0), 0);
        if (Math.abs(sumOfOwedAmounts - totalAmount) > 0.01) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Split amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).`,
                path: ["participants"] });
        }
    }
     if(data.splitType === "by_percentage") {
        const sumOfPercentages = finalParticipants.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
        if (Math.abs(sumOfPercentages - 100) > 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Percentages (${sumOfPercentages.toFixed(2)}%) must equal 100%.`,
                path: ["participants"] });
        }
    }
});


function Splitter() {
  const { control, watch, getValues, setValue, formState: { errors } } = useFormContext();
  const watchSplitType = watch("splitType");
  const watchAmount = watch("amount");
  const watchParticipants = watch('participants');

  const selectedCount = watchParticipants.filter((p: any) => p.selected).length;

  const runningTotal = useMemo(() => {
    const participants = getValues("participants") || [];
    const splitType = getValues("splitType");

    if (splitType === 'unequally') {
      const sum = participants.filter((p:any) => p.selected).reduce((acc:number, p:any) => acc + (Number(p.amountOwed) || 0), 0);
      return { type: 'amount', sum };
    }
    if (splitType === 'by_percentage') {
      const sum = participants.filter((p:any) => p.selected).reduce((acc:number, p:any) => acc + (Number(p.percentage) || 0), 0);
      return { type: 'percentage', sum };
    }
    return { type: 'none', sum: 0 };
  }, [JSON.stringify(watchParticipants), watchSplitType, watchAmount, getValues]);

  const toggleAll = (select: boolean) => {
    const participants = getValues('participants');
    participants.forEach((_: any, index: number) => {
      setValue(`participants.${index}.selected`, select, { shouldValidate: true, shouldDirty: true });
    });
  };

  return (
     <div className="space-y-3 pt-2 flex flex-col h-full">
        <div className="flex justify-between items-center text-xs">
            <p className="text-muted-foreground font-medium">{selectedCount} of {watchParticipants.length} selected</p>
            <div>
                <Button type="button" variant="link" size="sm" onClick={() => toggleAll(true)} className="p-1 h-auto mr-2">Select All</Button>
                <Button type="button" variant="link" size="sm" onClick={() => toggleAll(false)} className="p-1 h-auto text-destructive hover:text-destructive">Deselect All</Button>
            </div>
        </div>
        <div className="space-y-2 pr-2 h-full">
          {getValues('participants').map((item: any, index: number) => {
             return (
                <div key={item.userId} className={cn("flex items-center gap-x-4 gap-y-2 p-2 rounded-md transition-colors", watch(`participants.${index}.selected`) ? 'bg-muted/50' : 'opacity-60 hover:bg-muted/30')}>
                  <FormField
                    control={control}
                    name={`participants.${index}.selected`}
                    render={({ field }) => (
                      <FormItem className="flex items-center">
                        <FormControl>
                            <Button type="button" variant="ghost" className="h-10 w-10 p-0 rounded-full" onClick={() => field.onChange(!field.value)}>
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={item.avatarUrl} alt={item.name} />
                                    <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-none whitespace-nowrap truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 w-32">
                      {watch(`participants.${index}.selected`) && (
                      <>
                          {watchSplitType === "unequally" && (
                          <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pl-6"/></div></FormControl> )} />
                          )}
                          {watchSplitType === "by_shares" && (
                          <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">shares</span><Input type="number" step="1" placeholder="1" {...field} value={field.value ?? ''} className="h-8 w-full text-left pr-14"/></div></FormControl> )} />
                          )}
                          {watchSplitType === "by_percentage" && (
                          <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pr-6"/></div></FormControl> )} />
                          )}
                           {watchSplitType === "equally" && (
                               <p className="text-sm text-right text-muted-foreground w-full">
                                    {CURRENCY_SYMBOL}{(watch(`participants.${index}.amountOwed`) || 0).toFixed(2)}
                                </p>
                           )}
                      </>
                      )}
                  </div>
                </div>
            )})}
          </div>
        <div className="text-right text-xs mt-auto pr-2 font-medium">
          {runningTotal.type === 'amount' && ( <p className={cn(Math.abs(runningTotal.sum - (Number(watchAmount) || 0)) > 0.01 ? 'text-destructive' : 'text-primary')}> Total: {CURRENCY_SYMBOL}{(Number(runningTotal.sum) || 0).toFixed(2)} / {CURRENCY_SYMBOL}{(Number(watchAmount) || 0).toFixed(2)} </p> )}
          {runningTotal.type === 'percentage' && ( <p className={cn(Math.abs(runningTotal.sum - 100) > 0.01 ? 'text-destructive' : 'text-primary')}> Total: {(Number(runningTotal.sum) || 0).toFixed(2)}% / 100% </p> )}
        </div>
        {(errors.participants?.message || errors.participants?.root?.message) && (
            <div className="text-center">
                 <FormMessage>{errors.participants?.message?.toString()}</FormMessage>
                 {errors.participants?.root?.message && <FormMessage>{errors.participants.root.message}</FormMessage>}
            </div>
        )}
      </div>
  )
}

export function ExpenseForm({ group }: { group: Group }) {
  const form = useFormContext();

  const { control, watch, setValue, getValues } = form;

  const watchAmount = watch("amount");
  const watchSplitType = watch("splitType");
  const watchParticipants = watch("participants");
  const watchDescription = watch("description");
  const watchPayerType = watch('payerType');
  const watchMultiPayers = watch("multiPayers");

  const participantDeps = JSON.stringify(
    watchParticipants?.map((p: any) => ({
        selected: p.selected,
        shares: watchSplitType === 'by_shares' ? p.shares : undefined,
        percentage: watchSplitType === 'by_percentage' ? p.percentage : undefined,
        amountOwed: watchSplitType === 'unequally' ? p.amountOwed : undefined,
    }))
  );

  const multiPayersDep = JSON.stringify(watchMultiPayers);

  useEffect(() => {
    if (watchDescription) {
        const suggestedCategory = classifyExpense(watchDescription);
        setValue("category", suggestedCategory, { shouldValidate: true });
    }
  }, [watchDescription, setValue]);

  useEffect(() => {
    const totalAmount = Number(getValues("amount")) || 0;
    const splitType = getValues("splitType");
    const allParticipants = getValues("participants") || [];
    const selectedParticipants = allParticipants.filter((p: any) => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
      allParticipants.forEach((p: any, index: number) => {
        if (p.amountOwed !== 0) setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
      });
      return;
    }
    
    const newAmounts: { [userId: string]: number } = {};

    if (splitType === 'equally' || splitType === 'by_shares' || splitType === 'by_percentage') {
        let rawAmounts: number[];
        if (splitType === 'equally') {
            rawAmounts = selectedParticipants.map(() => totalAmount / numSelected);
        } else if (splitType === 'by_shares') {
            const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
            rawAmounts = totalShares > 0 ? selectedParticipants.map((p: any) => (totalAmount * (Number(p.shares) || 1)) / totalShares) : selectedParticipants.map(() => totalAmount / numSelected);
        } else { // by_percentage
            const percentages = selectedParticipants.map((p: any) => Number(p.percentage) || 0);
            const totalPercentage = percentages.reduce((sum: number, p: number) => sum + p, 0);
            rawAmounts = totalPercentage > 0 ? percentages.map((p: number) => (totalAmount * p) / totalPercentage) : selectedParticipants.map(() => totalAmount / numSelected);
        }
        
        const roundedAmounts = rawAmounts.map(amount => parseFloat(amount.toFixed(2)));
        let remainder = parseFloat((totalAmount - roundedAmounts.reduce((s, a) => s + a, 0)).toFixed(2));
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
            roundedAmounts[i % numSelected] = parseFloat((roundedAmounts[i % numSelected] + (0.01 * Math.sign(remainder))).toFixed(2));
        }
        selectedParticipants.forEach((p: any, i: number) => { newAmounts[p.userId] = roundedAmounts[i] });
    }

    allParticipants.forEach((p: any, index: number) => {
        const finalAmountToSet = p.selected ? (splitType === 'unequally' ? (Number(getValues(`participants.${index}.amountOwed`)) || 0) : (newAmounts[p.userId] || 0)) : 0;
        if (Math.abs((Number(getValues(`participants.${index}.amountOwed`)) || 0) - finalAmountToSet) > 1e-9) {
            setValue(`participants.${index}.amountOwed`, finalAmountToSet, { shouldValidate: true, shouldDirty: true });
        }
    });
  }, [watchAmount, watchSplitType, participantDeps, getValues, setValue]);
  
  const totalPaid = useMemo(() => {
    return watchMultiPayers?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;
  }, [multiPayersDep]);

  const amountRemainingToPay = (Number(watchAmount) || 0) - totalPaid;

  return (
    <div className="space-y-4 p-4">
      {/* Top Row: Main Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
         <FormField control={control} name="description" render={({ field }) => ( 
            <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g., Dinner, Movie Tickets" {...field} className="text-base" /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={control} name="amount" render={({ field }) => ( 
            <FormItem>
                <FormLabel>Amount</FormLabel>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">{CURRENCY_SYMBOL}</span>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-7 text-lg font-bold h-11" /></FormControl>
                </div>
                <FormMessage />
            </FormItem>
        )} />
         <FormField control={control} name="date" render={({ field }) => (
            <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-11", !field.value && "text-muted-foreground")}>
                            <Icons.Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
        )} />
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <FormField control={control} name="category" render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {categoryList.map((cat) => ( <SelectItem key={cat} value={cat}>{cat}</SelectItem> ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
      </div>

      {/* Second Row: Payer & Split Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Paid By Section */}
        <Card className="flex flex-col">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Paid By</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
                <Tabs defaultValue="single" className="w-full h-full flex flex-col" value={watchPayerType} onValueChange={(v) => setValue('payerType', v as any)}>
                    <div className="px-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Single Payer</TabsTrigger>
                            <TabsTrigger value="multiple">Multiple Payers</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="single" className="flex-1">
                         <FormField control={control} name="singlePayerId" render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="p-4">
                                    <ScrollArea className="h-[180px] pr-2">
                                        <div className="space-y-2">
                                        {group.members.map(member => (
                                            <FormItem key={member.uid} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors has-[:checked]:bg-muted">
                                                <FormControl><RadioGroupItem value={member.uid} /></FormControl>
                                                <FormLabel className="font-normal flex-1 cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8"><AvatarImage src={member.avatarUrl} /><AvatarFallback>{getInitials(getFullName(member.firstName, member.lastName))}</AvatarFallback></Avatar>
                                                        <span>{getFullName(member.firstName, member.lastName)}</span>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </TabsContent>
                    <TabsContent value="multiple" className="flex-1 p-4 space-y-2 flex flex-col">
                         <p className={cn("text-right text-xs font-medium", amountRemainingToPay !== 0 ? 'text-destructive' : 'text-primary')}>
                            {amountRemainingToPay > 0 ? `${CURRENCY_SYMBOL}${amountRemainingToPay.toFixed(2)} remaining` :
                            amountRemainingToPay < 0 ? `${CURRENCY_SYMBOL}${Math.abs(amountRemainingToPay).toFixed(2)} over` :
                            'All assigned'}
                        </p>
                        <ScrollArea className="h-[148px] pr-3">
                            <div className="space-y-2">
                            {getValues('multiPayers')?.map((item: any, index: number) => (
                                <FormField key={item.userId} control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (
                                    <FormItem><div className="flex items-center gap-3"><FormLabel className="font-normal truncate w-1/2">{item.name}</FormLabel><FormControl><div className="relative w-1/2"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 text-right pl-6"/></div></FormControl></div></FormItem>
                                )} />
                            ))}
                            </div>
                        </ScrollArea>
                        <FormMessage>{(form.formState.errors as any).multiPayers?.message}</FormMessage>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

        {/* Split Details Section */}
        <Card className="flex flex-col">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Split Details</CardTitle>
            </CardHeader>
             <CardContent className="p-0 flex-1 flex flex-col">
                <Tabs defaultValue="equally" className="w-full flex-1 flex flex-col" value={watchSplitType} onValueChange={(value) => setValue('splitType', value as any)}>
                    <div className="px-4">
                        <TabsList className="grid w-full grid-cols-4 h-auto">
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="equally" className="py-2 flex-col gap-1 h-auto"><Icons.Users className="h-5 w-5"/><span className="text-xs">Equally</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split equally among selected members</p></TooltipContent></Tooltip></TooltipProvider>
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="unequally" className="py-2 flex-col gap-1 h-auto"><Icons.Baseline className="h-5 w-5"/><span className="text-xs">Unequally</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Manually enter specific amounts for each person</p></TooltipContent></Tooltip></TooltipProvider>
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="by_shares" className="py-2 flex-col gap-1 h-auto"><Icons.Layers className="h-5 w-5"/><span className="text-xs">By Shares</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split by shares (e.g. 2 shares vs 1 share)</p></TooltipContent></Tooltip></TooltipProvider>
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="by_percentage" className="py-2 flex-col gap-1 h-auto"><Icons.PieChart className="h-5 w-5"/><span className="text-xs">By %</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split by percentage</p></TooltipContent></Tooltip></TooltipProvider>
                        </TabsList>
                    </div>
                    <ScrollArea className="px-4 py-2 flex-1 md:h-[220px]">
                        <TabsContent value="equally"><Splitter /></TabsContent>
                        <TabsContent value="unequally"><Splitter /></TabsContent>
                        <TabsContent value="by_shares"><Splitter /></TabsContent>
                        <TabsContent value="by_percentage"><Splitter /></TabsContent>
                    </ScrollArea>
                </Tabs>
             </CardContent>
        </Card>
      </div>
    </div>
  )
}
