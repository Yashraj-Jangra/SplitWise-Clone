
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, SettlementDocument } from "@/types";
import { addSettlement } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { getFullName } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";

const settlementSchema = z.object({
  paidById: z.string().min(1, "Payer is required."),
  paidToId: z.string().min(1, "Recipient is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required."}),
  notes: z.string().max(100, "Notes too long").optional(),
}).refine(data => data.paidById !== data.paidToId, {
  message: "Payer and recipient cannot be the same person.",
  path: ["paidToId"], 
});

type AddSettlementFormValues = z.infer<typeof settlementSchema>;

interface AddSettlementDialogProps {
  group: Group;
  onSettlementAdded: () => void;
  initialSettlement?: Partial<AddSettlementFormValues>;
  trigger?: React.ReactNode;
}

export function AddSettlementDialog({ group, onSettlementAdded, initialSettlement, trigger }: AddSettlementDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  const form = useForm<AddSettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      paidById: "",
      paidToId: "",
      amount: undefined,
      date: new Date(),
      notes: "",
    },
  });

  useEffect(() => {
    if (userProfile && open) {
        form.reset({
            paidById: initialSettlement?.paidById || userProfile.uid,
            paidToId: initialSettlement?.paidToId || "",
            amount: initialSettlement?.amount || undefined,
            date: new Date(),
            notes: initialSettlement?.notes || "",
        });
    }
  }, [userProfile, open, form, initialSettlement]);


  async function onSubmit(values: AddSettlementFormValues) {
    if (!userProfile) return;

    const newSettlement: Omit<SettlementDocument, 'date' | 'groupMemberIds'> & {date: Date} = {
      groupId: group.id,
      paidById: values.paidById,
      paidToId: values.paidToId,
      amount: values.amount,
      date: values.date,
      notes: values.notes,
    };

    try {
        await addSettlement(newSettlement, userProfile.uid);
        const paidByName = getFullName(group.members.find(m => m.uid === values.paidById)?.firstName, group.members.find(m => m.uid === values.paidById)?.lastName);
        const paidToName = getFullName(group.members.find(m => m.uid === values.paidToId)?.firstName, group.members.find(m => m.uid === values.paidToId)?.lastName);

        toast({
        title: "Settlement Recorded!",
        description: `Payment from ${paidByName} to ${paidToName} of ${CURRENCY_SYMBOL}${values.amount.toFixed(2)} recorded.`,
        });
        setOpen(false);
        onSettlementAdded();
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to record settlement.", variant: "destructive" });
    }
  }

  const FormContent = (
    <FormProvider {...form}>
      <form id="add-settlement-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="paidById"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Who Paid?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger></FormControl>
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
            <FormField
            control={form.control}
            name="paidToId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Who Received?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger></FormControl>
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
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount ({CURRENCY_SYMBOL})</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date of Payment</FormLabel>
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
      </form>
    </FormProvider>
  );

  const dialogTrigger = trigger ? trigger : (
    <Button variant="outline" disabled={!userProfile}>
        <Icons.Settle className="mr-2 h-4 w-4" /> Record Settlement
    </Button>
  );

  if (isMobile) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {dialogTrigger}
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-pane h-[80vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-center text-lg font-semibold">New Settlement</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4">{FormContent}</div>
                </ScrollArea>
                <SheetFooter className="p-4 bg-background/50 border-t">
                    <Button type="submit" form="add-settlement-form" disabled={form.formState.isSubmitting} className="w-full" size="lg">
                        {form.formState.isSubmitting ? "Recording..." : "Record Settlement"}
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
      <DialogContent className="glass-pane sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Record a Settlement in "{group.name}"</DialogTitle>
          <DialogDescription>
            Log a payment made between group members to settle debts.
          </DialogDescription>
        </DialogHeader>
        {FormContent}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-settlement-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Recording..." : "Record Settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
