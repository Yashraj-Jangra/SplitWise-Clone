
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, Settlement } from "@/types";
import { mockCurrentUser, mockSettlements } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";

const settlementSchema = z.object({
  paidById: z.string().min(1, "Payer is required."),
  paidToId: z.string().min(1, "Recipient is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required."}),
  notes: z.string().max(100, "Notes too long").optional(),
}).refine(data => data.paidById !== data.paidToId, {
  message: "Payer and recipient cannot be the same person.",
  path: ["paidToId"], // Attach error to paidToId field
});

type AddSettlementFormValues = z.infer<typeof settlementSchema>;

interface AddSettlementDialogProps {
  group: Group;
}

export function AddSettlementDialog({ group }: AddSettlementDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const currentUser = mockCurrentUser;

  const form = useForm<AddSettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      paidById: currentUser.id,
      paidToId: "",
      amount: 0,
      date: new Date(),
      notes: "",
    },
  });

  async function onSubmit(values: AddSettlementFormValues) {
    const newSettlement: Settlement = {
      id: `set${mockSettlements.length + 1}`,
      groupId: group.id,
      paidBy: group.members.find(m => m.id === values.paidById)!,
      paidTo: group.members.find(m => m.id === values.paidToId)!,
      amount: values.amount,
      date: values.date.toISOString(),
      notes: values.notes,
    };

    console.log("Adding settlement:", newSettlement);
    mockSettlements.push(newSettlement); // Simulate adding to backend
    
    // In a real app, this would trigger recalculation of balances
    
    toast({
      title: "Settlement Recorded!",
      description: `Payment from ${newSettlement.paidBy.name} to ${newSettlement.paidTo.name} of ${CURRENCY_SYMBOL}${values.amount} recorded.`,
    });
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icons.Settle className="mr-2 h-4 w-4" /> Record Settlement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Record a Settlement in "{group.name}"</DialogTitle>
          <DialogDescription>
            Log a payment made between group members to settle debts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="paidById"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Who Paid?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger></FormControl>
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
                name="paidToId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Who Received?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger></FormControl>
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
            </div>
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
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                    <FormLabel className="mb-[0.6rem]">Date of Payment</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Icons.Home className="ml-auto h-4 w-4 opacity-50" /> {/* Replace with Calendar icon */}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., For Goa trip dinner, Rent May" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recording..." : "Record Settlement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
