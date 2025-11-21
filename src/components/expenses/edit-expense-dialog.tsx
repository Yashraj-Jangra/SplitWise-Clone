
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Group, Expense, ExpenseDocument } from "@/types";
import { getGroupById, updateExpense } from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { getFullName } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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

    const updatedExpenseData = {
      groupId: group.id,
      description: values.description,
      amount: totalAmount,
      date: values.date,
      notes: values.notes || "",
      payers,
      participants: finalParticipants,
      splitType: values.splitType,
      category: values.category,
      expenseCreatorId: expense.expenseCreatorId,
      createdAt: expense.createdAt,
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

  const SkeletonLoader = () => (
     <div className="p-6">
        <Skeleton className="h-full w-full" />
     </div>
  );
  
  const FormProviderWrapper = ({children}: {children: React.ReactNode}) => (
    <FormProvider {...form}>
      <form id="edit-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full">
        {children}
      </form>
    </FormProvider>
  );

  const FormContent = isGroupLoading || !group 
    ? <SkeletonLoader /> 
    : <ExpenseForm group={group} closeDialog={() => onOpenChange(false)} isEditing isMobile={isMobile} />;

  if(isMobile) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-screen flex flex-col p-0 border-0 bg-background">
                <FormProviderWrapper>
                   {FormContent}
                </FormProviderWrapper>
            </SheetContent>
        </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[580px] p-0 gap-0 border-0 bg-transparent shadow-none">
          <FormProviderWrapper>
              {FormContent}
          </FormProviderWrapper>
      </DialogContent>
    </Dialog>
  );
}
