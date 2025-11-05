
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, ExpenseDocument } from "@/types";
import { addExpense } from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";
import { expenseSchema, ExpenseForm } from "./expense-form";

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
      notes: "",
      payerType: 'single',
      singlePayerId: userProfile?.uid || "",
      splitType: "equally",
      participants: [],
      category: "Other",
    }
  });

  useEffect(() => {
    if (userProfile && open) {
      form.reset({
        description: "",
        amount: undefined,
        date: new Date(),
        notes: "",
        payerType: 'single',
        singlePayerId: userProfile.uid,
        multiPayers: group.members.map(member => ({
            userId: member.uid,
            name: `${member.firstName} ${member.lastName || ''}`.trim(),
            amount: undefined,
        })),
        splitType: "equally",
        participants: group.members.map(member => ({
          userId: member.uid,
          name: `${member.firstName} ${member.lastName || ''}`.trim(),
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

  async function onSubmit(values: AddExpenseFormValues) {
    if (!userProfile) return;

    let payers: { userId: string, amount: number }[] = [];
    if (values.payerType === 'single' && values.singlePayerId) {
        payers = [{ userId: values.singlePayerId, amount: values.amount }];
    } else {
        payers = values.multiPayers?.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! })) || [];
    }
    
    if (payers.length === 0) {
        form.setError("payerType", { type: "manual", message: "At least one payer must be specified."});
        return;
    }

    const finalParticipants = values.participants
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
    
    const newExpense: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId' | 'createdAt'> & {date: Date} = {
      groupId: group.id,
      description: values.description,
      amount: totalAmount,
      notes: values.notes,
      payers: payers,
      date: values.date,
      splitType: values.splitType,
      participants: finalParticipants,
      category: values.category,
      createdAt: new Date(),
    };
    
    try {
        await addExpense(newExpense, userProfile.uid);
        toast({
        title: "Expense Added!",
        description: `"${values.description}" has been successfully added to ${group.name}.`,
        });
        setOpen(false);
        if (onExpenseAdded) onExpenseAdded();
        window.dispatchEvent(new CustomEvent('data-changed'));
    } catch (error) {
        toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
    }
  }

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
                    <FormProvider {...form}>
                      <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
                        <ExpenseForm group={group}/>
                      </form>
                    </FormProvider>
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
        <div className="flex-1 overflow-hidden -mx-6 px-1">
          <ScrollArea className="h-full px-5">
              <FormProvider {...form}>
                <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <ExpenseForm group={group}/>
                </form>
              </FormProvider>
          </ScrollArea>
        </div>
        <DialogFooter className="border-t pt-4 px-6 pb-6 -mx-6 -mb-6 bg-background/50 rounded-b-lg">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-expense-form" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
