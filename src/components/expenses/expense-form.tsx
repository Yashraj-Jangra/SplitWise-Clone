
"use client";

import { useEffect, useMemo } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/icons";
import type { Group, UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { classifyExpense, categoryList } from "@/lib/expense-categories";
import { getFullName, getInitials } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Switch } from "../ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "@/components/ui/label";

export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required." }),
  isMultiplePayers: z.boolean().default(false),
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
    if (!data.isMultiplePayers) {
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
                message: `The sum of payments (${CURRENCY_SYMBOL}${totalPaid.toFixed(2)}) must equal the total expense amount (${CURRENCY_SYMBOL}${data.amount.toFixed(2)}).`,
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
                message: `Sum of amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).`,
                path: ["participants"] });
        }
    }
     if(data.splitType === "by_percentage") {
        const sumOfPercentages = finalParticipants.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
        if (Math.abs(sumOfPercentages - 100) > 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Sum of percentages (${sumOfPercentages.toFixed(2)}%) must equal 100%.`,
                path: ["participants"] });
        }
    }
});

function Splitter() {
  const { control, watch, getValues, formState: { errors } } = useFormContext();
  const watchSplitType = watch("splitType");
  const watchAmount = watch("amount");

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
  }, [JSON.stringify(watch("participants")), watchSplitType, watchAmount, getValues]);

  return (
     <div className="space-y-4 pt-2 flex flex-col h-full">
        <div className="space-y-3">
              {getValues('participants').map((item: any, index: number) => (
                <div key={item.userId} className="flex items-center justify-between gap-x-4 gap-y-2">
                  <FormField
                    control={control}
                    name={`participants.${index}.selected`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 flex-grow min-w-[150px]">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={item.avatarUrl} alt={item.name} />
                                <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                            </Avatar>
                            <FormLabel className="font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap truncate">
                                {item.name}
                            </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0 w-32">
                      {watch(`participants.${index}.selected`) && (
                      <>
                          {watchSplitType === "unequally" && (
                          <FormField
                              control={control}
                              name={`participants.${index}.amountOwed`}
                              render={({ field }) => ( 
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pl-6"/>
                                    </div>
                                </FormControl> )}
                          />
                          )}
                          {watchSplitType === "by_shares" && (
                          <FormField
                              control={control}
                              name={`participants.${index}.shares`}
                              render={({ field }) => ( 
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">shares</span>
                                        <Input type="number" step="1" placeholder="1" {...field} value={field.value ?? ''} className="h-8 w-full text-left pr-14"/>
                                    </div>
                                </FormControl>
                               )}
                          />
                          )}
                          {watchSplitType === "by_percentage" && (
                              <FormField
                              control={control}
                              name={`participants.${index}.percentage`}
                              render={({ field }) => (
                                <FormControl>
                                     <div className="relative">
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pr-6"/>
                                    </div>
                                </FormControl>
                                )}
                              />
                          )}
                           {watchSplitType === "equally" && (
                               <p className="text-sm text-right text-muted-foreground w-full">
                                    {CURRENCY_SYMBOL}{watch(`participants.${index}.amountOwed`).toFixed(2)}
                                </p>
                           )}
                      </>
                      )}
                  </div>
                </div>
              ))}
          </div>
        <div className="text-right text-xs mt-2 pr-2 font-medium">
          {runningTotal.type === 'amount' && (
              <p className={cn(Math.abs(runningTotal.sum - (Number(watchAmount) || 0)) > 0.01 ? 'text-destructive' : 'text-primary')}>
                  Total: {CURRENCY_SYMBOL}{(Number(runningTotal.sum) || 0).toFixed(2)} / {CURRENCY_SYMBOL}{(Number(watchAmount) || 0).toFixed(2)}
              </p>
          )}
          {runningTotal.type === 'percentage' && (
              <p className={cn(Math.abs(runningTotal.sum - 100) > 0.01 ? 'text-destructive' : 'text-primary')}>
                  Total: {(Number(runningTotal.sum) || 0).toFixed(2)}% / 100%
              </p>
          )}
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
  const { userProfile } = useAuth();

  const { control, watch, setValue, getValues } = form;

  const watchAmount = watch("amount");
  const watchSplitType = watch("splitType");
  const watchParticipants = watch("participants");
  const watchDescription = watch("description");
  const watchIsMultiplePayers = watch("isMultiplePayers");
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
        if (p.amountOwed !== 0) {
          setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
        }
      });
      return;
    }
    
    const newAmounts: { [userId: string]: number } = {};

    if (splitType === 'equally' || splitType === 'by_shares' || splitType === 'by_percentage') {
        let rawAmounts: number[];

        if (splitType === 'equally') {
            const share = totalAmount / numSelected;
            rawAmounts = selectedParticipants.map(() => share);
        } else if (splitType === 'by_shares') {
            const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
            if (totalShares > 0) {
                rawAmounts = selectedParticipants.map((p: any) => (totalAmount * (Number(p.shares) || 1)) / totalShares);
            } else {
                const share = totalAmount / numSelected;
                rawAmounts = selectedParticipants.map(() => share);
            }
        } else { // by_percentage
            const percentages = selectedParticipants.map((p: any) => Number(p.percentage) || 0);
            const totalPercentage = percentages.reduce((sum: number, p: number) => sum + p, 0);
             if (totalPercentage > 0) {
                 rawAmounts = percentages.map((p: number) => (totalAmount * p) / totalPercentage);
            } else {
                 rawAmounts = selectedParticipants.map(() => totalAmount / numSelected);
            }
        }
        
        const roundedAmounts = rawAmounts.map(amount => parseFloat(amount.toFixed(2)));
        const sumOfRounded = roundedAmounts.reduce((sum, amount) => sum + amount, 0);
        let remainder = parseFloat((totalAmount - sumOfRounded).toFixed(2));
        
        for (let i = 0; i < Math.abs(remainder * 100); i++) {
            const index = i % numSelected;
            roundedAmounts[index] = parseFloat((roundedAmounts[index] + (0.01 * Math.sign(remainder))).toFixed(2));
        }

        selectedParticipants.forEach((p: any, i: number) => {
            newAmounts[p.userId] = roundedAmounts[i];
        });
    }

    allParticipants.forEach((p: any, index: number) => {
        let finalAmountToSet: number;
        if (!p.selected) {
            finalAmountToSet = 0;
        } else if (splitType === 'unequally') {
            finalAmountToSet = Number(getValues(`participants.${index}.amountOwed`)) || 0;
        } else {
            finalAmountToSet = newAmounts[p.userId] || 0;
        }
        
        const currentFormValue = Number(getValues(`participants.${index}.amountOwed`)) || 0;

        if (Math.abs(currentFormValue - finalAmountToSet) > 1e-9) {
            setValue(`participants.${index}.amountOwed`, finalAmountToSet, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    });
  }, [watchAmount, watchSplitType, participantDeps, getValues, setValue]);
  
  const totalPaid = useMemo(() => {
    return watchMultiPayers?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;
  }, [multiPayersDep]);

  const amountRemainingToPay = (Number(watchAmount) || 0) - totalPaid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-4">
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        <FormField control={control} name="description" render={({ field }) => ( 
            <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g., Dinner, Movie Tickets" {...field} className="text-base" /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={control} name="amount" render={({ field }) => ( 
            <FormItem>
                <FormLabel>Amount</FormLabel>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">{CURRENCY_SYMBOL}</span>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8 text-2xl font-bold h-12" /></FormControl>
                </div>
                <FormMessage />
            </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={control} name="date" render={({ field }) => (
                <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
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
        <Card>
            <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Paid By</CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="isMultiplePayers" className="text-muted-foreground">Multiple</Label>
                        <FormField control={control} name="isMultiplePayers" render={({ field }) => (
                        <FormControl>
                            <Switch id="isMultiplePayers" checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        )} />
                    </div>
                </div>
                 {watchIsMultiplePayers && (
                     <CardDescription className={cn("text-right text-xs pt-1", amountRemainingToPay !== 0 ? 'text-destructive' : 'text-primary')}>
                        {amountRemainingToPay > 0 ? `${CURRENCY_SYMBOL}${amountRemainingToPay.toFixed(2)} remaining` :
                        amountRemainingToPay < 0 ? `${CURRENCY_SYMBOL}${Math.abs(amountRemainingToPay).toFixed(2)} over` :
                        'All assigned'}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {!watchIsMultiplePayers ? (
                <FormField control={control} name="singlePayerId" render={({ field }) => (
                    <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select who paid" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {group.members.map(member => (
                            <SelectItem key={member.uid} value={member.uid}>{getFullName(member.firstName, member.lastName)} {member.uid === userProfile?.uid ? "(You)" : ""}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                ) : (
                <ScrollArea className="h-40 md:h-32">
                    <div className="space-y-3 pr-3">
                        {getValues('multiPayers')?.map((item: any, index: number) => (
                             <FormField key={item.userId} control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (
                                <FormItem>
                                <div className="grid grid-cols-2 items-center gap-4">
                                     <FormLabel className="font-normal truncate">{item.name}</FormLabel>
                                     <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 text-right pl-6"/>
                                        </div>
                                    </FormControl>
                                </div>
                                </FormItem>
                            )} />
                        ))}
                    </div>
                </ScrollArea>
                )}
            </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-4">
         <Card className="h-full flex flex-col">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Split Details</CardTitle>
            </CardHeader>
             <CardContent className="p-0 flex-1 flex flex-col">
                <Tabs defaultValue="equally" className="w-full flex-1 flex flex-col" value={watchSplitType} onValueChange={(value) => setValue('splitType', value as any)}>
                    <div className="px-4">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                        <TabsTrigger value="equally" className="py-2">Equally</TabsTrigger>
                        <TabsTrigger value="unequally" className="py-2">Unequally</TabsTrigger>
                        <TabsTrigger value="by_shares" className="py-2">By Shares</TabsTrigger>
                        <TabsTrigger value="by_percentage" className="py-2">By %</TabsTrigger>
                        </TabsList>
                    </div>
                    <ScrollArea className="px-4 py-2 flex-1 h-64 md:h-auto">
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
