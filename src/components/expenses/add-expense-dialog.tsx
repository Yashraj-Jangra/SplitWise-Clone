
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, Expense, User, ExpenseParticipant } from "@/types";
import { mockCurrentUser, mockExpenses, mockGroups } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format }
from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  paidById: z.string().min(1, "Payer is required."),
  date: z.date({ required_error: "Date is required."}),
  splitType: z.enum(["equally", "unequally", "by_shares", "by_percentage"]),
  participants: z.array(z.object({
    userId: z.string(),
    name: z.string(), // For display
    selected: z.boolean(),
    amountOwed: z.coerce.number().optional(), // For unequal split
    shares: z.coerce.number().optional(), // For by_shares split
    percentage: z.coerce.number().optional(), // For by_percentage split
  })).min(1, "At least one participant is required."),
  category: z.string().optional(),
});

type AddExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  group: Group;
}

export function AddExpenseDialog({ group }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const currentUser = mockCurrentUser;

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidById: currentUser.id,
      date: new Date(),
      splitType: "equally",
      participants: group.members.map(member => ({
        userId: member.id,
        name: member.name,
        selected: true, // Initially all selected
        amountOwed: 0,
        shares: 1,
        percentage: 0,
      })),
      category: "",
    },
  });

  const { fields } = useFieldArray({ // `update` function removed as it's not used safely here
    control: form.control,
    name: "participants"
  });

  const watchAmount = form.watch("amount");
  const watchSplitType = form.watch("splitType");
  const watchParticipants = form.watch("participants");

  useEffect(() => {
    const selectedParticipants = watchParticipants.filter(p => p.selected);
    const totalAmount = watchAmount || 0;
    const epsilon = 0.001; // Threshold for floating point comparisons

    // Scenario 1: No selected participants or total amount is zero or less.
    // All participant amounts should be zero.
    if (!selectedParticipants.length || totalAmount <= 0) {
        watchParticipants.forEach((participant, index) => {
            if (participant.amountOwed !== undefined && Math.abs(participant.amountOwed - 0) > epsilon) {
                form.setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
            } else if (participant.amountOwed === undefined) {
                form.setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
            }
        });
        return;
    }

    // Scenario 2: Calculations based on split type
    const calculatedParticipantValues = watchParticipants.map(p => {
        let calculatedAmountOwed = p.amountOwed; // Default to current, important for "unequally"

        if (!p.selected) {
            calculatedAmountOwed = 0;
        } else {
            switch (watchSplitType) {
                case "equally":
                    calculatedAmountOwed = totalAmount / selectedParticipants.length;
                    break;
                case "by_shares":
                    const totalShares = selectedParticipants.reduce((sum, sp) => sum + (sp.shares || 0), 0);
                    if (totalShares > 0) {
                        calculatedAmountOwed = (totalAmount * (p.shares || 0)) / totalShares;
                    } else { // Fallback to equal if totalShares is 0 but participants are selected
                        calculatedAmountOwed = totalAmount / selectedParticipants.length;
                    }
                    break;
                case "by_percentage":
                    calculatedAmountOwed = (totalAmount * (p.percentage || 0)) / 100;
                    break;
                case "unequally":
                    // For "unequally", amountOwed is manually set by user.
                    // We only ensure it's 0 if not selected (handled by `!p.selected` above).
                    break;
            }
        }
        return { ...p, amountOwed: calculatedAmountOwed };
    });

    calculatedParticipantValues.forEach((pVal, index) => {
        const currentOwed = watchParticipants[index].amountOwed ?? 0;
        const newOwed = pVal.amountOwed ?? 0;

        if (Math.abs(currentOwed - newOwed) > epsilon) {
            form.setValue(`participants.${index}.amountOwed`, newOwed, { shouldValidate: true });
        }
    });

  }, [watchAmount, watchSplitType, watchParticipants, form]);


  async function onSubmit(values: AddExpenseFormValues) {
    const finalParticipants: ExpenseParticipant[] = values.participants
      .filter(p => p.selected)
      .map(p => ({
        user: group.members.find(m => m.id === p.userId)!,
        amountOwed: p.amountOwed || 0, 
        share: p.shares,
      }));
    
    if(values.splitType === "unequally") {
        const sumOfOwedAmounts = finalParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
        if (Math.abs(sumOfOwedAmounts - values.amount) > 0.01) { 
            form.setError("participants", { type: "manual", message: `Sum of amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${values.amount.toFixed(2)}).` });
            return;
        }
    }
     if(values.splitType === "by_percentage") {
        const sumOfPercentages = finalParticipants.reduce((sum, p) => sum + (p.percentage || 0), 0);
        if (Math.abs(sumOfPercentages - 100) > 0.01) {
            form.setError("participants", { type: "manual", message: `Sum of percentages (${sumOfPercentages}%) must equal 100%.` });
            return;
        }
    }


    const newExpense: Expense = {
      id: `exp${mockExpenses.length + 1}`,
      groupId: group.id,
      description: values.description,
      amount: values.amount,
      paidBy: group.members.find(m => m.id === values.paidById)!,
      date: values.date.toISOString(),
      splitType: values.splitType,
      participants: finalParticipants,
      category: values.category,
    };

    console.log("Adding expense:", newExpense);
    mockExpenses.push(newExpense); 
    
    const groupToUpdate = mockGroups.find(g => g.id === group.id);
    if (groupToUpdate) groupToUpdate.totalExpenses += newExpense.amount;

    toast({
      title: "Expense Added!",
      description: `"${values.description}" for ${CURRENCY_SYMBOL}${values.amount} added to ${group.name}.`,
    });
    setOpen(false);
    form.reset({
        description: "",
        amount: 0,
        paidById: currentUser.id,
        date: new Date(),
        splitType: "equally",
        participants: group.members.map(member => ({
            userId: member.id,
            name: member.name,
            selected: true,
            amountOwed: 0,
            shares: 1,
            percentage: 0,
        })),
        category: "",
    });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
             form.reset({
                description: "",
                amount: 0,
                paidById: currentUser.id,
                date: new Date(),
                splitType: "equally",
                participants: group.members.map(member => ({
                    userId: member.id,
                    name: member.name,
                    selected: true,
                    amountOwed: 0,
                    shares: 1,
                    percentage: 0,
                })),
                category: "",
            });
        }
    }}>
      <DialogTrigger asChild>
        <Button>
          <Icons.Add className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Add New Expense to "{group.name}"</DialogTitle>
          <DialogDescription>
            Enter the details of the expense. It will be shared among selected group members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="max-h-[60vh] p-1 pr-4">
              <div className="space-y-4">
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
                        <FormLabel>Category (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., Food, Travel" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="paidById"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Paid By</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select who paid" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {group.members.map(member => (
                                <SelectItem key={member.id} value={member.id}>{member.name} {member.id === currentUser.id ? "(You)" : ""}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                        <FormLabel className="mb-[0.6rem]">Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                </div>

                <FormField
                  control={form.control}
                  name="splitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Split Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select split method" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="equally">Equally</SelectItem>
                          <SelectItem value="unequally">Unequally (enter amounts)</SelectItem>
                          <SelectItem value="by_shares">By Shares</SelectItem>
                          <SelectItem value="by_percentage">By Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <FormDescription>Select who participated and how the expense is split.</FormDescription>
                  <div className="space-y-2 rounded-md border p-3">
                    {fields.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-muted/50">
                        <FormField
                          control={form.control}
                          name={`participants.${index}.selected`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap">
                                {item.name} {item.userId === currentUser.id ? "(You)" : ""}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        {watchParticipants[index]?.selected && (
                          <>
                            {watchSplitType === "unequally" && (
                              <FormField
                                control={form.control}
                                name={`participants.${index}.amountOwed`}
                                render={({ field }) => (
                                  <FormItem className="flex-1 min-w-[80px]">
                                    <FormControl><Input type="number" step="0.01" placeholder="Amount" {...field} className="h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                            {watchSplitType === "by_shares" && (
                              <FormField
                                control={form.control}
                                name={`participants.${index}.shares`}
                                render={({ field }) => (
                                  <FormItem className="flex-1 min-w-[70px]">
                                    <FormControl><Input type="number" step="1" placeholder="Shares" {...field} defaultValue={1} className="h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                            {watchSplitType === "by_percentage" && (
                                <FormField
                                control={form.control}
                                name={`participants.${index}.percentage`}
                                render={({ field }) => (
                                    <FormItem className="flex-1 min-w-[70px]">
                                    <FormControl><Input type="number" step="0.01" placeholder="%" {...field} className="h-8 text-xs" /></FormControl>
                                    </FormItem>
                                )}
                                />
                            )}
                            {/* Display calculated amount for non-manual splits */}
                            {(watchSplitType === "equally" || watchSplitType === "by_shares" || watchSplitType === "by_percentage") && (
                                <div className="text-xs text-muted-foreground w-[80px] text-right">
                                {CURRENCY_SYMBOL}{(watchParticipants[index]?.amountOwed || 0).toFixed(2)}
                                </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                   <FormMessage>{form.formState.errors.participants?.message}</FormMessage>
                </FormItem>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

