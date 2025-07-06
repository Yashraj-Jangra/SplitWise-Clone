
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, Settlement, SettlementDocument } from "@/types";
import { updateSettlement, getGroupById } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { getFullName } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

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

type EditSettlementFormValues = z.infer<typeof settlementSchema>;

interface EditSettlementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settlement: Settlement;
    group?: Group;
    onActionComplete?: () => void;
}

export function EditSettlementDialog({ open, onOpenChange, settlement, group: initialGroup, onActionComplete }: EditSettlementDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(initialGroup || null);
  const [isGroupLoading, setIsGroupLoading] = useState(false);

  const form = useForm<EditSettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      paidById: settlement.paidBy.uid,
      paidToId: settlement.paidTo.uid,
      amount: settlement.amount,
      date: new Date(settlement.date),
      notes: settlement.notes || "",
    },
  });

  useEffect(() => {
    if (!initialGroup && open) {
        setIsGroupLoading(true);
        async function fetchGroup() {
            const fetchedGroup = await getGroupById(settlement.groupId);
            if (fetchedGroup) setGroup(fetchedGroup);
            setIsGroupLoading(false);
        }
        fetchGroup();
    } else if (initialGroup) {
        setGroup(initialGroup);
    }
  }, [initialGroup, settlement.groupId, open]);

  useEffect(() => {
    form.reset({
        paidById: settlement.paidBy.uid,
        paidToId: settlement.paidTo.uid,
        amount: settlement.amount,
        date: new Date(settlement.date),
        notes: settlement.notes || "",
    });
  }, [settlement, form]);


  async function onSubmit(values: EditSettlementFormValues) {
    if (!userProfile || !group) return;

    const updatedSettlementData: Partial<SettlementDocument> = {
        paidById: values.paidById,
        paidToId: values.paidToId,
        amount: values.amount,
        date: values.date,
        notes: values.notes,
    };

    try {
        await updateSettlement(settlement.id, updatedSettlementData, userProfile.uid);
        toast({ title: "Settlement Updated", description: "The settlement has been successfully updated." });
        onOpenChange(false);
        if (onActionComplete) onActionComplete();
    } catch (error) {
        toast({ title: "Error", description: "Failed to update settlement.", variant: "destructive" });
    }
  }

  const renderSkeleton = () => (
    <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
    </div>
  );

  const renderForm = () => (
    <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4" id="edit-settlement-form">
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
                        {group?.members.map(member => (
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
                        {group?.members.map(member => (
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
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Edit Settlement</DialogTitle>
          <DialogDescription>
            Update the details of this payment.
          </DialogDescription>
        </DialogHeader>
        {isGroupLoading || !group ? renderSkeleton() : renderForm()}
        <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="edit-settlement-form" disabled={form.formState.isSubmitting || isGroupLoading}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
