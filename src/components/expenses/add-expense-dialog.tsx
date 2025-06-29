
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, UserProfile, ExpensePayerDocument, ExpenseParticipantDocument, ExpenseDocument } from "@/types";
import { addExpense } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { classifyExpense, categoryList } from "@/lib/expense-categories";
import { getFullName, getInitials } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Switch } from "../ui/switch";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const expenseSchema = z.object({
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
});


type AddExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  group: Group;
  onExpenseAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddExpenseDialog({ group, onExpenseAdded, trigger }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: undefined,
      date: new Date(),
      isMultiplePayers: false,
      singlePayerId: userProfile?.uid || "",
      splitType: "equally",
      participants: [],
      category: "Other",
    }
  });

  const watchAmount = form.watch("amount");
  const watchSplitType = form.watch("splitType");
  const watchParticipants = form.watch("participants");
  const watchDescription = form.watch("description");
  const watchIsMultiplePayers = form.watch("isMultiplePayers");
  const watchMultiPayers = form.watch("multiPayers");

  const participantDeps = JSON.stringify(
    watchParticipants?.map(p => ({
      selected: p.selected,
      shares: watchSplitType === 'by_shares' ? p.shares : undefined,
      percentage: watchSplitType === 'by_percentage' ? p.percentage : undefined,
      amountOwed: watchSplitType === 'unequally' ? p.amountOwed : undefined,
    }))
  );

  const multiPayersDep = JSON.stringify(watchMultiPayers);

  useEffect(() => {
    if (userProfile && open) {
      form.reset({
        description: "",
        amount: undefined,
        date: new Date(),
        isMultiplePayers: false,
        singlePayerId: userProfile.uid,
        multiPayers: group.members.map(member => ({
            userId: member.uid,
            name: getFullName(member.firstName, member.lastName),
            amount: undefined,
        })),
        splitType: "equally",
        participants: group.members.map(member => ({
          userId: member.uid,
          name: getFullName(member.firstName, member.lastName),
          avatarUrl: member.avatarUrl,
          selected: true,
          amountOwed: 0,
          shares: 1,
          percentage: 0,
        })),
        category: "Other",
      });
    }
  }, [userProfile, open, group.members, form]);

  useEffect(() => {
    if (watchDescription) {
        const suggestedCategory = classifyExpense(watchDescription);
        form.setValue("category", suggestedCategory, { shouldValidate: true });
    }
  }, [watchDescription, form]);

  useEffect(() => {
    const totalAmount = Number(form.getValues("amount")) || 0;
    const splitType = form.getValues("splitType");
    const allParticipants = form.getValues("participants") || [];
    const selectedParticipants = allParticipants.filter(p => p.selected);
    const numSelected = selectedParticipants.length;

    if (totalAmount <= 0 || numSelected === 0) {
      allParticipants.forEach((p, index) => {
        if (p.amountOwed !== 0) {
          form.setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
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
            const totalShares = selectedParticipants.reduce((sum, p) => sum + (Number(p.shares) || 1), 0);
            if (totalShares > 0) {
                rawAmounts = selectedParticipants.map(p => (totalAmount * (Number(p.shares) || 1)) / totalShares);
            } else {
                const share = totalAmount / numSelected;
                rawAmounts = selectedParticipants.map(() => share);
            }
        } else { // by_percentage
            const percentages = selectedParticipants.map(p => Number(p.percentage) || 0);
            const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
             if (totalPercentage > 0) {
                 rawAmounts = percentages.map(p => (totalAmount * p) / totalPercentage);
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

        selectedParticipants.forEach((p, i) => {
            newAmounts[p.userId] = roundedAmounts[i];
        });
    }

    allParticipants.forEach((p, index) => {
        let finalAmountToSet: number;
        if (!p.selected) {
            finalAmountToSet = 0;
        } else if (splitType === 'unequally') {
            finalAmountToSet = Number(form.getValues(`participants.${index}.amountOwed`)) || 0;
        } else {
            finalAmountToSet = newAmounts[p.userId] || 0;
        }
        
        const currentFormValue = Number(form.getValues(`participants.${index}.amountOwed`)) || 0;

        if (Math.abs(currentFormValue - finalAmountToSet) > 1e-9) {
            form.setValue(`participants.${index}.amountOwed`, finalAmountToSet, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    });
  }, [watchAmount, watchSplitType, participantDeps, form]);
  
  const totalPaid = useMemo(() => {
    return watchMultiPayers?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  }, [multiPayersDep]);

  const amountRemainingToPay = (Number(watchAmount) || 0) - totalPaid;

  const runningTotal = useMemo(() => {
    const participants = watchParticipants || [];
    const splitType = watchSplitType;

    if (splitType === 'unequally') {
      const sum = participants.filter(p => p.selected).reduce((acc, p) => acc + (Number(p.amountOwed) || 0), 0);
      return { type: 'amount', sum };
    }
    if (splitType === 'by_percentage') {
      const sum = participants.filter(p => p.selected).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
      return { type: 'percentage', sum };
    }
    return { type: 'none', sum: 0 };
  }, [participantDeps, watchSplitType, watchAmount]);


  async function onSubmit(values: AddExpenseFormValues) {
    if (!userProfile) return;

    let payers: ExpensePayerDocument[] = [];
    if (!values.isMultiplePayers && values.singlePayerId) {
        payers = [{ userId: values.singlePayerId, amount: values.amount }];
    } else {
        payers = values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];
    }

    if (payers.length === 0) {
        form.setError("isMultiplePayers", { type: "manual", message: "At least one payer must be specified."});
        return;
    }

    const finalParticipants: ExpenseParticipantDocument[] = values.participants
      .filter(p => p.selected)
      .map(p => ({
        userId: p.userId,
        amountOwed: Number(p.amountOwed) || 0,
        share: Number(p.shares) || 1,
      }));

    if (finalParticipants.length === 0) {
        form.setError("participants", { type: "manual", message: "At least one participant must be selected." });
        return;
    }

    const totalAmount = Number(values.amount);

    if(values.splitType === "unequally") {
        const sumOfOwedAmounts = finalParticipants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
        if (Math.abs(sumOfOwedAmounts - totalAmount) > 0.01) {
             form.setError("participants", { type: "manual", message: `Sum of amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).` });
            return;
        }
    }
     if(values.splitType === "by_percentage") {
        const sumOfPercentages = values.participants
            .filter(p => p.selected)
            .reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
        if (Math.abs(sumOfPercentages - 100) > 0.01) {
            form.setError("participants", { type: "manual", message: `Sum of percentages (${sumOfPercentages.toFixed(2)}%) must equal 100%.` });
            return;
        }
    }

    const newExpense: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId'> & {date: Date} = {
      groupId: group.id,
      description: values.description,
      amount: totalAmount,
      payers: payers,
      date: values.date,
      splitType: values.splitType,
      participants: finalParticipants,
      category: values.category,
    };
    
    try {
        await addExpense(newExpense, userProfile.uid);
        toast({
        title: "Expense Added!",
        description: `"${values.description}" for ${CURRENCY_SYMBOL}${totalAmount.toFixed(2)} added to ${group.name}.`,
        });
        setOpen(false);
        if (onExpenseAdded) onExpenseAdded(); // Callback to refresh parent data
        router.refresh(); // Also trigger a server refresh
    } catch (error) {
        toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
    }
  }

  const FormContent = (
    <FormProvider {...form}>
      <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Main Inputs */}
            <div className="space-y-4">
               <FormField control={form.control} name="description" render={({ field }) => ( 
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="e.g., Dinner, Movie Tickets" {...field} className="text-base" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="amount" render={({ field }) => ( 
                    <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">{CURRENCY_SYMBOL}</span>
                            <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8 text-2xl font-bold h-12" /></FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                 )} />
            </div>

            {/* Secondary Details */}
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="date" render={({ field }) => (
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
                 <FormField control={form.control} name="category" render={({ field }) => (
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
        
            {/* Payer Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">Paid By</FormLabel>
                <div className="flex items-center gap-2 text-sm">
                    <FormLabel htmlFor="isMultiplePayers" className="text-muted-foreground">Multiple</FormLabel>
                    <FormField control={form.control} name="isMultiplePayers" render={({ field }) => (
                    <FormControl>
                        <Switch id="isMultiplePayers" checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    )} />
                </div>
              </div>
              {!watchIsMultiplePayers ? (
                <FormField control={form.control} name="singlePayerId" render={({ field }) => (
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
                <>
                <p className={cn("text-right text-sm font-medium", amountRemainingToPay !== 0 ? 'text-destructive' : 'text-primary')}>
                    {amountRemainingToPay > 0 ? `${CURRENCY_SYMBOL}${amountRemainingToPay.toFixed(2)} remaining` :
                    amountRemainingToPay < 0 ? `${CURRENCY_SYMBOL}${Math.abs(amountRemainingToPay).toFixed(2)} over` :
                    'All assigned'}
                </p>
                <ScrollArea className="h-32 pr-2">
                    <div className="space-y-3">
                    {form.getValues('multiPayers')?.map((item, index) => (
                        <div key={item.userId} className="flex items-center justify-between gap-4">
                        <FormLabel className="font-normal truncate">{item.name}</FormLabel>
                            <FormField control={form.control} name={`multiPayers.${index}.amount`} render={({ field }) => (
                            <FormControl><Input type="number" step="0.01" placeholder={`${CURRENCY_SYMBOL}0.00`} {...field} value={field.value ?? ''} className="h-8 w-28 text-right"/></FormControl>
                            )} />
                        </div>
                    ))}
                    </div>
                </ScrollArea>
                </>
              )}
            </div>
          </div>
          {/* RIGHT COLUMN */}
          <div className="space-y-6">
             <div className="rounded-lg border p-4 flex flex-col">
                <FormLabel className="text-base mb-4 block">Split Details</FormLabel>
                <Tabs defaultValue="equally" className="w-full flex-1 flex flex-col" value={watchSplitType} onValueChange={(value) => form.setValue('splitType', value as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="equally">Equally</TabsTrigger>
                    <TabsTrigger value="unequally">Unequally</TabsTrigger>
                    <TabsTrigger value="by_shares">Shares</TabsTrigger>
                    <TabsTrigger value="by_percentage">%</TabsTrigger>
                    </TabsList>
                    <div className="mt-4 flex-1">
                        <SplitContent form={form} userProfile={userProfile} runningTotal={runningTotal} watchAmount={watchAmount} watchSplitType={watchSplitType}/>
                    </div>
                </Tabs>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
  
  if (!userProfile) return null;

  const dialogTrigger = trigger || <Button><Icons.Add className="mr-2 h-4 w-4" /> Add Expense</Button>;
  const mobileTrigger = trigger || <Button className="w-full"><Icons.Add className="mr-2 h-4 w-4" /> Add Expense</Button>;

  if(isMobile) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {mobileTrigger}
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-pane h-[95vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-center text-lg font-semibold">New Expense</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4">{FormContent}</div>
                </ScrollArea>
                <SheetFooter className="p-4 bg-background/50 border-t">
                    <Button type="submit" form="add-expense-form" disabled={form.formState.isSubmitting} className="w-full" size="lg">
                        {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="glass-pane sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">New Expense in "{group.name}"</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 py-4">{FormContent}</div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <Button type="submit" form="add-expense-form" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SplitContent({ form, userProfile, runningTotal, watchAmount, watchSplitType }: {form: any, userProfile: any, runningTotal: any, watchAmount: number, watchSplitType: string}) {
  return (
     <div className="space-y-4 pt-2 flex flex-col h-full">
        <ScrollArea className="flex-1 pr-3 h-[240px]">
          <div className="space-y-3">
              {form.getValues('participants').map((item: any, index: number) => (
                <div key={item.userId} className="flex items-center justify-between gap-x-2 gap-y-2">
                  <FormField
                    control={form.control}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                      {form.watch(`participants.${index}.selected`) && (
                      <>
                          {watchSplitType === "unequally" && (
                          <FormField
                              control={form.control}
                              name={`participants.${index}.amountOwed`}
                              render={({ field }) => ( <FormControl><Input type="number" step="0.01" placeholder="Amt" {...field} value={field.value ?? ''} className="h-8 w-24 text-right"/></FormControl> )}
                          />
                          )}
                          {watchSplitType === "by_shares" && (
                          <FormField
                              control={form.control}
                              name={`participants.${index}.shares`}
                              render={({ field }) => ( <FormControl><Input type="number" step="1" placeholder="Shares" {...field} value={field.value ?? ''} className="h-8 w-24 text-right"/></FormControl> )}
                          />
                          )}
                          {watchSplitType === "by_percentage" && (
                              <FormField
                              control={form.control}
                              name={`participants.${index}.percentage`}
                              render={({ field }) => ( <FormControl><Input type="number" step="0.01" placeholder="%" {...field} value={field.value ?? ''} className="h-8 w-24 text-right"/></FormControl> )}
                              />
                          )}
                      </>
                      )}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
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
        <FormMessage>{form.formState.errors.participants?.message}</FormMessage>
        {form.formState.errors.participants?.root?.message && <FormMessage>{form.formState.errors.participants.root.message}</FormMessage>}
      </div>
  )
}
