"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, Settlement, SettlementDocument } from "@/types";
import { updateSettlement, getGroupById } from "@/lib/firestore.service";
import { cn, getFullName, getInitials } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";
import { appEventEmitter } from "@/lib/event-emitter";
import { CalendarIcon, Pencil, Loader2, ArrowRight } from "lucide-react";

const settlementSchema = z.object({
  paidById: z.string().min(1, "Payer is required."),
  paidToId: z.string().min(1, "Recipient is required."),
  amount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number({ invalid_type_error: "Amount is required." }).positive("Amount must be positive.")
  ),
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
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(initialGroup || null);
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const isMobile = useIsMobile();

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

  const watchPaidById = form.watch("paidById");
  const watchPaidToId = form.watch("paidToId");
  const watchAmount = form.watch("amount");

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
    if (open) {
      form.reset({
          paidById: settlement.paidBy.uid,
          paidToId: settlement.paidTo.uid,
          amount: settlement.amount,
          date: new Date(settlement.date),
          notes: settlement.notes || "",
      });
    }
  }, [settlement, form, open]);

  // Filter recipient list to exclude currently selected payer
  const availableRecipients = useMemo(() => {
    return group?.members.filter(m => m.uid !== watchPaidById) || [];
  }, [group?.members, watchPaidById]);

  // Auto-switch recipient if payer matches current recipient
  useEffect(() => {
    if (watchPaidById && watchPaidToId === watchPaidById && group) {
      const firstOther = availableRecipients[0]?.uid || "";
      form.setValue("paidToId", firstOther, { shouldValidate: true });
    }
  }, [watchPaidById, watchPaidToId, availableRecipients, form, group]);

  const payerMember = group?.members.find(m => m.uid === watchPaidById);
  const recipientMember = group?.members.find(m => m.uid === watchPaidToId);

  async function onSubmit(values: EditSettlementFormValues) {
    if (!userProfile || !group) return;

    const updatedSettlementData: Partial<SettlementDocument> & { groupId: string } = {
        groupId: group.id,
        paidById: values.paidById,
        paidToId: values.paidToId,
        amount: values.amount,
        date: values.date as unknown as any,
        notes: values.notes,
    };

    try {
        await updateSettlement(settlement.id, updatedSettlementData, userProfile.uid);
        toast({ title: "Settlement Updated", description: "The settlement has been successfully updated." });
        onOpenChange(false);
        if (onActionComplete) onActionComplete();
        appEventEmitter.emit('data-changed');
    } catch (error) {
        toast({ title: "Error", description: "Failed to update settlement.", variant: "destructive" });
    }
  }

  const renderSkeleton = () => (
    <div className="space-y-4 pt-4 p-6">
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

  const FormContent = group && (
    <FormProvider {...form}>
      <form id="edit-settlement-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        {/* ── Top Flow Banner: Person [Avatar] ➔ Person [Avatar] ────────── */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-1 my-1 text-center flex-wrap">
          {/* Payer Avatar + Name */}
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border border-primary/50 shrink-0">
              <AvatarImage src={payerMember?.avatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {payerMember ? getInitials(payerMember.firstName, payerMember.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-base font-semibold text-foreground">
              {payerMember ? (watchPaidById === userProfile?.uid ? "You" : payerMember.firstName) : "Payer"}
            </span>
          </div>

          {/* Small Arrow Icon */}
          <ArrowRight className="h-4 w-4 text-primary shrink-0 mx-0.5" />

          {/* Recipient Avatar + Name */}
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border border-emerald-500/50 shrink-0">
              <AvatarImage src={recipientMember?.avatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-emerald-500/10 text-emerald-500">
                {recipientMember ? getInitials(recipientMember.firstName, recipientMember.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-base font-semibold text-foreground">
              {recipientMember ? (watchPaidToId === userProfile?.uid ? "You" : recipientMember.firstName) : "Recipient"}
            </span>
          </div>
        </div>

        {/* ── Centered Amount Input (Exact Clamp Match to ExpenseForm) ────── */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative border-b-2 border-border/40 pb-2 flex items-center justify-center max-w-[280px] mx-auto focus-within:border-primary transition-colors">
                  <span className="text-[clamp(2rem,8vw,3rem)] font-bold text-muted-foreground align-baseline leading-none mr-1 select-none">
                    {CURRENCY_SYMBOL}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full bg-transparent text-[clamp(2rem,8vw,3rem)] leading-none font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-none p-0 tracking-tight text-center hide-number-arrows"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-destructive text-xs mt-1 text-center" />
            </FormItem>
          )}
        />

        {/* ── Dropdown Selectors: "Who paid?" & "To whom?" ──────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <FormField
            control={form.control}
            name="paidById"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Who paid?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal focus:ring-primary">
                      <SelectValue placeholder="Select payer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-border/30">
                    {group.members.map(member => (
                      <SelectItem key={member.uid} value={member.uid}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{getFullName(member.firstName, member.lastName)} {member.uid === userProfile?.uid ? "(You)" : ""}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paidToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">To whom?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal focus:ring-primary">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-border/30">
                    {availableRecipients.map(member => (
                      <SelectItem key={member.uid} value={member.uid}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{getFullName(member.firstName, member.lastName)} {member.uid === userProfile?.uid ? "(You)" : ""}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* ── Bottom Pill Inputs: Date & Notes ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => {
              const [dateOpen, setDateOpen] = useState(false);

              return (
                <FormItem className="flex flex-col">
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 rounded-xl justify-start text-left font-normal text-sm px-4 bg-muted/20 border-border/30 hover:bg-muted/30",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{field.value ? format(field.value, "MMMM d, yyyy") : "Pick a date"}</span>
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-border/30" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                          setDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-xs" />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Add notes"
                      {...field}
                      className="pl-10 h-11 text-sm font-normal rounded-xl bg-muted/20 border-border/30 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

      </form>
    </FormProvider>
  );

  const ActionFooter = (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto rounded-xl h-10 text-sm font-medium px-4 hover:bg-muted hover:text-foreground transition-colors"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        form="edit-settlement-form"
        disabled={form.formState.isSubmitting}
        className="w-full sm:w-auto rounded-xl h-10 text-sm font-medium px-5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );

  const formId = "edit-settlement-form";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background">
          <SheetHeader className="p-4 border-b border-border/20">
            <SheetTitle className="text-center text-lg font-semibold">Edit Settlement</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              {isGroupLoading || !group ? renderSkeleton() : FormContent}
            </div>
          </ScrollArea>
          <SheetFooter className="p-4 bg-background/50 border-t border-border/20">
            {!isGroupLoading && group && ActionFooter}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
        <div className="flex flex-col h-full">
          <div className="p-6">
            <DialogHeader className="mb-4 text-left">
              <DialogTitle className="text-lg font-semibold">Edit Settlement</DialogTitle>
              <DialogDescription className="sr-only">
                Update the details of this payment.
              </DialogDescription>
            </DialogHeader>
            {isGroupLoading || !group ? renderSkeleton() : FormContent}
          </div>

          <DialogFooter className="p-6 pt-0 flex flex-row items-center justify-end gap-2">
            {!isGroupLoading && group && ActionFooter}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
