
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Group, Expense, ExpenseDocument } from "@/types";
import { getGroupById, updateExpense } from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { getFullName } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { expenseSchema, ExpenseForm } from "./expense-form";

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
  const isMobile = useIsMobile();

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
        description: "",
        amount: 0,
        date: new Date(),
        notes: "",
        payerType: 'single',
        splitType: "equally",
        participants: [],
        category: "Other",
    },
  });

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
                avatarUrl: member.avatarUrl,
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
            notes: expense.notes || "",
            payerType: expense.payers.length > 1 ? 'multiple' : 'single',
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

  async function onSubmit(values: EditExpenseFormValues) {
    if (!userProfile || !group) return;

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

    const updatedExpenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'createdAt' > & { date: Date; createdAt: string } = {
      groupId: group.id,
      description: values.description,
      amount: totalAmount,
      date: values.date,
      notes: values.notes || "",
      payers: payers,
      participants: finalParticipants.map(({userId, amountOwed, share}) => ({userId, amountOwed, share})),
      splitType: values.splitType,
      category: values.category,
      expenseCreatorId: expense.expenseCreatorId,
      groupCreatorId: expense.groupCreatorId,
      createdAt: expense.createdAt, // Preserve original creation time
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
        }
        window.dispatchEvent(new CustomEvent('data-changed'));
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Error Updating Expense", description: errorMessage, variant: "destructive"})
    }
  }
  
  const FormContent = (
    <FormProvider {...form}>
      <form id="edit-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isGroupLoading || !group ? (
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-6 p-1">
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <Skeleton className="h-full w-full min-h-[300px]" />
            </div>
          ) : (
             <ExpenseForm group={group}/>
          )}
      </form>
    </FormProvider>
  );

  const title = "Edit Expense";
  const formId = "edit-expense-form";

  if(isMobile) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="glass-pane h-[95vh] flex flex-col rounded-t-2xl border-border/20 p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-center text-lg font-semibold">{title}</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4">{FormContent}</div>
                </ScrollArea>
                <SheetFooter className="p-4 bg-background/50 border-t">
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting || isGroupLoading} className="w-full" size="lg">
                        {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-pane sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden -mx-6 px-1">
            <ScrollArea className="h-full px-5 py-4">
                {FormContent}
            </ScrollArea>
        </div>
        <DialogFooter className="border-t pt-4 px-6 pb-6 -mx-6 -mb-6 bg-background/50 rounded-b-lg">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form={formId} disabled={form.formState.isSubmitting || isGroupLoading} className="w-full sm:w-auto">
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
