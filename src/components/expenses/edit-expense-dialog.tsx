
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, Expense, ExpensePayerDocument, ExpenseParticipantDocument, ExpenseDocument } from "@/types";
import { getGroupById, updateExpense } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { classifyExpense, categoryList } from "@/lib/expense-categories";
import { Skeleton } from "../ui/skeleton";
import { getFullName } from "@/lib/utils";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required." }),
  paymentType: z.enum(['single', 'multiple']).default('single'),
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
    selected: z.boolean(),
    amountOwed: z.coerce.number().optional(),
    shares: z.coerce.number().min(0, "Shares cannot be negative").optional(),
    percentage: z.coerce.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100").optional(),
  })).min(1, "At least one participant is required.")
   .refine(arr => arr.some(p => p.selected), { message: "At least one participant must be selected." }),
  category: z.string({ required_error: "Category is required." }),
}).superRefine((data, ctx) => {
    if (data.paymentType === 'single') {
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


type EditExpenseFormValues = z.infer<typeof expenseSchema>;

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  group?: Group;
  onActionComplete?: () => void;
}

export function EditExpenseDialog({ open, onOpenChange, expense, group: initialGroup, onActionComplete }: EditExpenseDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(initialGroup || null);
  const [isGroupLoading, setIsGroupLoading] = useState(false);

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
        description: "",
        amount: 0,
        date: new Date(),
        paymentType: 'single',
        splitType: "equally",
        participants: [],
        category: "Other",
    },
  });

  const watchAmount = form.watch("amount");
  const watchSplitType = form.watch("splitType");
  const watchParticipants = form.watch("participants");
  const watchDescription = form.watch("description");
  const watchPaymentType = form.watch("paymentType");
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
    if (!initialGroup && open) {
        setIsGroupLoading(true);
        async function fetchGroup() {
            const fetchedGroup = await getGroupById(expense.groupId);
            if (fetchedGroup) setGroup(fetchedGroup);
            setIsGroupLoading(false);
        }
        fetchGroup();
    } else if (initialGroup) {
        setGroup(initialGroup);
    }
  }, [initialGroup, expense.groupId, open]);
  
  useEffect(() => {
    if (group && userProfile && open) {
        const participantData = group.members.map(member => {
            const existingParticipant = expense.participants.find(p => p.user.uid === member.uid);
            return {
                userId: member.uid,
                name: getFullName(member.firstName, member.lastName),
                selected: !!existingParticipant,
                amountOwed: existingParticipant?.amountOwed || 0,
                shares: existingParticipant?.share || 1,
                percentage: 0, 
            };
        });

        if (expense.splitType === 'by_percentage') {
            const totalAmount = expense.amount;
            if (totalAmount > 0) {
                participantData.forEach(p => {
                    if (p.selected) {
                        p.percentage = parseFloat(((p.amountOwed / totalAmount) * 100).toFixed(2));
                    }
                });
            }
        }
      
        form.reset({
            description: expense.description,
            amount: expense.amount,
            date: new Date(expense.date),
            paymentType: expense.payers.length > 1 ? 'multiple' : 'single',
            singlePayerId: expense.payers.length === 1 ? expense.payers[0].user.uid : undefined,
            multiPayers: group.members.map(member => ({
                userId: member.uid,
                name: getFullName(member.firstName, member.lastName),
                amount: expense.payers.find(p => p.user.uid === member.uid)?.amount || undefined,
            })),
            splitType: expense.splitType,
            participants: participantData,
            category: expense.category || 'Other',
        });
    }
  }, [group, userProfile, open, expense, form]);

  useEffect(() => {
    if (watchDescription) {
        const suggestedCategory = classifyExpense(watchDescription);
        if (form.getValues('category') !== suggestedCategory) {
            form.setValue("category", suggestedCategory, { shouldValidate: true, shouldDirty: true });
        }
    }
  }, [watchDescription, form]);

  useEffect(() => {
    if (!open) return;
    
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
                shouldValidate: true, shouldDirty: true
            });
        }
    });
  }, [watchAmount, watchSplitType, participantDeps, form, open]);

  const totalPaid = useMemo(() => {
    return watchMultiPayers?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  }, [multiPayersDep]);

  const amountRemainingToPay = watchAmount - totalPaid;

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


  async function onSubmit(values: EditExpenseFormValues) {
    if (!userProfile || !group) return;

    let payers: ExpensePayerDocument[] = [];
    if (values.paymentType === 'single' && values.singlePayerId) {
        payers = [{ userId: values.singlePayerId, amount: values.amount }];
    } else {
        payers = values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];
    }

    if (payers.length === 0) {
        form.setError("paymentType", { type: "manual", message: "At least one payer must be specified."});
        return;
    }

    const finalParticipants: ExpenseParticipantDocument[] = values.participants
      .filter(p => p.selected)
      .map(p => ({
        userId: p.userId,
        amountOwed: Number(p.amountOwed) || 0,
        share: Number(p.shares),
      }));

    if (finalParticipants.length === 0) {
        form.setError("participants", { type: "manual", message: "At least one participant must be selected." });
        return;
    }

    const totalAmount = Number(values.amount);

    if(values.splitType === "unequally") {
        const sumOfOwedAmounts = finalParticipants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
        if (Math.abs(sumOfOwedAmounts - totalAmount) > 0.01 * finalParticipants.length ) {
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

    const updatedExpenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'groupMemberIds'> & { date: Date } = {
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
        await updateExpense(expense.id, expense.amount, updatedExpenseData, userProfile.uid);
        toast({
        title: "Expense Updated!",
        description: `"${values.description}" has been successfully updated.`,
        });

        onOpenChange(false);
        if (onActionComplete) {
            onActionComplete();
        } else {
            router.refresh();
        }
    } catch(error) {
        toast({ title: "Error", description: "Failed to update expense", variant: "destructive"})
    }
  }
  
  const renderContent = () => {
    if (isGroupLoading || !group) {
        return (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <Skeleton className="h-24 w-full" />
                 <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                 </div>
            </div>
        )
    }

    return (
         <FormProvider {...form}>
          <form id="edit-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Input placeholder="e.g., Dinner, Movie Tickets" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount ({CURRENCY_SYMBOL})</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryList.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                 <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="single" /></FormControl>
                            <FormLabel className="font-normal">Single Payer</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="multiple" /></FormControl>
                            <FormLabel className="font-normal">Multiple Payers</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchPaymentType === 'single' && (
                    <FormField
                        control={form.control}
                        name="singlePayerId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Paid By</FormLabel>
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
                        )}
                    />
                )}

                 {watchPaymentType === 'multiple' && (
                     <FormItem>
                        <div className="flex justify-between items-center">
                            <FormLabel>Payers</FormLabel>
                            <p className={cn("text-sm font-medium", amountRemainingToPay !== 0 ? 'text-destructive' : 'text-green-500')}>
                                {amountRemainingToPay > 0 ? `${CURRENCY_SYMBOL}${amountRemainingToPay.toFixed(2)} remaining` :
                                 amountRemainingToPay < 0 ? `${CURRENCY_SYMBOL}${Math.abs(amountRemainingToPay).toFixed(2)} overpaid` :
                                 'All assigned'}
                            </p>
                        </div>
                        <div className="space-y-3 rounded-md border p-4 max-h-48 overflow-y-auto">
                            {form.getValues('multiPayers')?.map((item, index) => (
                                <div key={item.userId} className="flex items-center justify-between gap-4">
                                     <FormLabel className="font-normal whitespace-nowrap truncate flex-1">
                                        {item.name} {item.userId === userProfile?.uid ? "(You)" : ""}
                                      </FormLabel>
                                       <FormField
                                            control={form.control}
                                            name={`multiPayers.${index}.amount`}
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-8 w-28 text-right"/>
                                                </FormControl>
                                            )}
                                        />
                                </div>
                            ))}
                        </div>
                         <FormMessage>{form.formState.errors.multiPayers?.message}</FormMessage>
                     </FormItem>
                 )}

                <FormField
                  control={form.control}
                  name="splitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Split Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select split method" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="equally">Split Equally</SelectItem>
                          <SelectItem value="unequally">Enter Amounts Manually</SelectItem>
                          <SelectItem value="by_shares">Split by Shares</SelectItem>
                          <SelectItem value="by_percentage">Split by Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <FormDescription>Select who participated and how the expense is split.</FormDescription>
                  <div className="space-y-3 rounded-md border p-4 max-h-48 overflow-y-auto">
                     {form.getValues('participants').map((item, index) => (
                      <div key={item.userId} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 rounded p-1 hover:bg-muted/50">
                        <FormField
                          control={form.control}
                          name={`participants.${index}.selected`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 flex-grow min-w-[150px]">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap truncate">
                                {item.name} {item.userId === userProfile?.uid ? "(You)" : ""}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto pl-7 sm:pl-0">
                            {watchParticipants?.[index]?.selected && (
                            <>
                                {watchSplitType === "unequally" && (
                                <FormField
                                    control={form.control}
                                    name={`participants.${index}.amountOwed`}
                                    render={({ field }) => ( <FormControl><Input type="number" step="0.01" placeholder="Amount" {...field} className="h-8 w-24"/></FormControl> )}
                                />
                                )}
                                {watchSplitType === "by_shares" && (
                                <FormField
                                    control={form.control}
                                    name={`participants.${index}.shares`}
                                    render={({ field }) => ( <FormControl><Input type="number" step="1" placeholder="Shares" {...field} className="h-8 w-24"/></FormControl> )}
                                />
                                )}
                                {watchSplitType === "by_percentage" && (
                                    <FormField
                                    control={form.control}
                                    name={`participants.${index}.percentage`}
                                    render={({ field }) => ( <FormControl><Input type="number" step="0.01" placeholder="%" {...field} className="h-8 w-24"/></FormControl> )}
                                    />
                                )}
                            </>
                            )}
                             <div className="w-20 text-right text-sm font-medium text-muted-foreground">
                              {(watchSplitType !== 'unequally') && watchParticipants?.[index]?.selected && watchAmount > 0 && (
                                  <span>{CURRENCY_SYMBOL}{Number(form.getValues(`participants.${index}.amountOwed`) || 0).toFixed(2)}</span>
                              )}
                             </div>
                        </div>
                      </div>
                    ))}
                  </div>
                   <div className="text-right text-sm mt-2 pr-2">
                        {runningTotal.type === 'amount' && (
                            <p className={cn(Math.abs(runningTotal.sum - watchAmount) > 0.01 ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                Total Allocated: {CURRENCY_SYMBOL}{runningTotal.sum.toFixed(2)}
                            </p>
                        )}
                        {runningTotal.type === 'percentage' && (
                            <p className={cn(Math.abs(runningTotal.sum - 100) > 0.01 ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                Total Percentage: {runningTotal.sum.toFixed(2)}%
                            </p>
                        )}
                    </div>
                   <FormMessage>{form.formState.errors.participants?.message}</FormMessage>
                   {form.formState.errors.participants?.root?.message && <FormMessage>{form.formState.errors.participants.root.message}</FormMessage>}
                </FormItem>
              </div>
          </form>
        </FormProvider>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Edit Expense</DialogTitle>
          <DialogDescription>
            Modify the details of the expense below.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
        <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" form="edit-expense-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
