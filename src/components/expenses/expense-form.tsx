
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons, IconName } from "@/components/icons";
import type { Group } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { classifyExpense, getMasterCategory } from "@/lib/expense-categories";
import { getFullName, getInitials } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// --- Form Schema ---
export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Date is required." }),
  notes: z.string().max(200, "Notes must be 200 characters or less.").optional(),
  payerType: z.enum(['single', 'multiple']).default('single'),
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
    if (data.payerType === 'single') {
        if (!data.singlePayerId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A payer must be selected.", path: ["singlePayerId"] });
        }
    } else { // multiple
        const totalPaid = data.multiPayers?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        if (Math.abs(totalPaid - data.amount) > 0.01) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Payments (${CURRENCY_SYMBOL}${totalPaid.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${data.amount.toFixed(2)}).`, path: ["multiPayers"] });
        }
    }

    const totalAmount = Number(data.amount) || 0;
    const finalParticipants = data.participants.filter(p => p.selected);

     if(data.splitType === "unequally") {
        const sumOfOwedAmounts = finalParticipants.reduce((sum, p) => sum + (Number(p.amountOwed) || 0), 0);
        if (Math.abs(sumOfOwedAmounts - totalAmount) > 0.01) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Split amounts (${CURRENCY_SYMBOL}${sumOfOwedAmounts.toFixed(2)}) must equal total expense (${CURRENCY_SYMBOL}${totalAmount.toFixed(2)}).`, path: ["participants"] });
        }
    }
     if(data.splitType === "by_percentage") {
        const sumOfPercentages = finalParticipants.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
        if (Math.abs(sumOfPercentages - 100) > 0.01) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Percentages (${sumOfPercentages.toFixed(2)}%) must equal 100%.`, path: ["participants"] });
        }
    }
});

// --- Panel Components ---

const Panel = ({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) => {
    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-full bg-card rounded-r-lg flex flex-col"
        >
            <div className="flex items-center justify-between p-4 border-b">
                 <h3 className="text-lg font-semibold">{title}</h3>
                 <Button variant="ghost" size="icon" className="h-8 w-8 z-10" onClick={onClose}><X className="h-5 w-5"/></Button>
            </div>
            {children}
        </motion.div>
    );
};


const PayerPanel = ({ onClose }: { onClose: () => void }) => {
    const { control, watch, setValue, getValues } = useFormContext();
    const watchPayerType = watch('payerType');
    const watchMultiPayers = watch("multiPayers");
    const watchAmount = watch("amount");
    const groupMembers = getValues("participants");
    
    const totalPaid = useMemo(() => {
        return watchMultiPayers?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;
    }, [watchMultiPayers]);

    const amountRemaining = (Number(watchAmount) || 0) - totalPaid;

    return (
        <Panel onClose={onClose} title="Choose Payer(s)">
            <div className="flex-1 flex flex-col p-0">
                 <Tabs defaultValue="single" className="w-full h-full flex flex-col" value={watchPayerType} onValueChange={(v) => setValue('payerType', v as any)}>
                    <div className="px-4 pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Single Payer</TabsTrigger>
                            <TabsTrigger value="multiple">Multiple Payers</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="single" className="flex-1 mt-0">
                         <FormField control={control} name="singlePayerId" render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <div className="p-4">
                                    <ScrollArea className="h-[calc(100vh-18rem)] sm:h-auto sm:max-h-[350px] pr-2">
                                        <div className="space-y-2">
                                        {groupMembers.map((member: any) => (
                                            <FormItem key={member.userId} onClick={() => {field.onChange(member.userId); onClose();}} className={cn("flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer", field.value === member.userId && "bg-muted")}>
                                                <Avatar className="h-8 w-8"><AvatarImage src={member.avatarUrl} /><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar>
                                                <FormLabel className="font-normal flex-1 cursor-pointer">{member.name}</FormLabel>
                                            </FormItem>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </TabsContent>
                    <TabsContent value="multiple" className="flex-1 p-4 mt-0 space-y-2 flex flex-col">
                         <p className={cn("text-right text-xs font-medium", amountRemaining !== 0 ? 'text-destructive' : 'text-primary')}>
                            {amountRemaining > 0 ? `${CURRENCY_SYMBOL}${amountRemaining.toFixed(2)} remaining` :
                            amountRemaining < 0 ? `${CURRENCY_SYMBOL}${Math.abs(amountRemaining).toFixed(2)} over` :
                            'All assigned'}
                        </p>
                        <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[300px] pr-3 -mr-3">
                            <div className="space-y-2">
                            {getValues('multiPayers')?.map((item: any, index: number) => (
                                <FormField key={item.userId} control={control} name={`multiPayers.${index}.amount`} render={({ field }) => (
                                    <FormItem><div className="flex items-center gap-3"><FormLabel className="font-normal truncate w-1/2">{item.name}</FormLabel><FormControl><div className="relative w-1/2"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 text-right pl-6"/></div></FormControl></div></FormItem>
                                )} />
                            ))}
                            </div>
                        </ScrollArea>
                        <FormMessage>{(control.getFieldState("multiPayers") as any).error?.message}</FormMessage>
                         <div className="mt-auto pt-2">
                             <Button onClick={onClose} className="w-full">Done</Button>
                         </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Panel>
    )
};

const SplitterPanel = ({ onClose }: { onClose: () => void }) => {
    const { control, watch, setValue, getValues, formState: { errors } } = useFormContext();
    const watchSplitType = watch("splitType");
    const watchAmount = watch("amount");
    const watchParticipants = watch('participants');

    const selectedCount = watchParticipants.filter((p: any) => p.selected).length;

    const runningTotal = useMemo(() => {
        const participants = getValues("participants") || [];
        const splitType = getValues("splitType");

        if (splitType === 'unequally') {
            const sum = participants.filter((p:any) => p.selected).reduce((acc:number, p:any) => acc + (Number(p.amountOwed) || 0), 0);
            return { type: 'amount', sum };
        }
        if (splitType === 'by_percentage') {
            const sum = participants.filter((p:any) => p.selected).reduce((acc:number, p:any) => acc + (Number(p.percentage) || 0), 0);
            return { type: 'percentage', sum };
        }
        return { type: 'none', sum: 0 };
    }, [watchParticipants, watchSplitType, getValues]);

    const toggleAll = (select: boolean) => {
        getValues('participants').forEach((_: any, index: number) => {
            setValue(`participants.${index}.selected`, select, { shouldValidate: true, shouldDirty: true });
        });
    };

    return (
        <Panel onClose={onClose} title="Choose Split Options">
            <div className="p-4 flex-1 flex flex-col gap-4">
                <Tabs defaultValue="equally" className="w-full flex-1 flex flex-col" value={watchSplitType} onValueChange={(value) => setValue('splitType', value as any)}>
                    <TabsList className="grid w-full grid-cols-4 h-auto">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="equally" className="py-2 flex-col gap-1 h-auto"><Icons.Users className="h-5 w-5"/><span className="text-xs">Equally</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split equally among selected members</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="unequally" className="py-2 flex-col gap-1 h-auto"><Icons.Baseline className="h-5 w-5"/><span className="text-xs">Unequally</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Manually enter specific amounts for each person</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="by_shares" className="py-2 flex-col gap-1 h-auto"><Icons.Layers className="h-5 w-5"/><span className="text-xs">By Shares</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split by shares (e.g. 2 shares vs 1 share)</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><TabsTrigger value="by_percentage" className="py-2 flex-col gap-1 h-auto"><Icons.PieChart className="h-5 w-5"/><span className="text-xs">By %</span></TabsTrigger></TooltipTrigger><TooltipContent><p>Split by percentage</p></TooltipContent></Tooltip></TooltipProvider>
                    </TabsList>
                    
                    <div className="flex justify-between items-center text-xs mt-4">
                        <p className="text-muted-foreground font-medium">{selectedCount} of {watchParticipants.length} selected</p>
                        <div>
                            <Button type="button" variant="link" size="sm" onClick={() => toggleAll(true)} className="p-1 h-auto mr-2">Select All</Button>
                            <Button type="button" variant="link" size="sm" onClick={() => toggleAll(false)} className="p-1 h-auto text-destructive hover:text-destructive">Deselect All</Button>
                        </div>
                    </div>
                    
                    <ScrollArea className="flex-1 pr-2 -mr-2 h-[calc(100vh-28rem)] sm:h-auto sm:max-h-[250px]">
                        <div className="space-y-2">
                        {getValues('participants').map((item: any, index: number) => {
                            return (
                                <div key={item.userId} className={cn("flex items-center gap-x-4 gap-y-2 p-2 rounded-md transition-colors", watch(`participants.${index}.selected`) ? 'bg-muted/50' : 'opacity-60 hover:bg-muted/30')}>
                                <Controller control={control} name={`participants.${index}.selected`} render={({ field }) => (
                                    <FormItem className="flex items-center">
                                        <FormControl>
                                            <Button type="button" variant="ghost" className="h-10 w-10 p-0 rounded-full" onClick={() => field.onChange(!field.value)}>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={item.avatarUrl} alt={item.name} />
                                                    <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </FormControl>
                                    </FormItem>
                                )}/>
                                <div className="flex-1">
                                    <p className="font-medium text-sm leading-none whitespace-nowrap truncate">{item.name}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 w-32">
                                    {watch(`participants.${index}.selected`) && (
                                    <>
                                        {watchSplitType === "unequally" && (
                                        <FormField control={control} name={`participants.${index}.amountOwed`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pl-6"/></div></FormControl> )} />
                                        )}
                                        {watchSplitType === "by_shares" && (
                                        <FormField control={control} name={`participants.${index}.shares`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">shares</span><Input type="number" step="1" placeholder="1" {...field} value={field.value ?? ''} className="h-8 w-full text-left pr-14"/></div></FormControl> )} />
                                        )}
                                        {watchSplitType === "by_percentage" && (
                                        <FormField control={control} name={`participants.${index}.percentage`} render={({ field }) => ( <FormControl><div className="relative"><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="h-8 w-full text-right pr-6"/></div></FormControl> )} />
                                        )}
                                        {watchSplitType === "equally" && (
                                            <p className="text-sm text-right text-muted-foreground w-full">
                                                {CURRENCY_SYMBOL}{(watch(`participants.${index}.amountOwed`) || 0).toFixed(2)}
                                            </p>
                                        )}
                                    </>
                                    )}
                                </div>
                                </div>
                            )})}
                        </div>
                    </ScrollArea>
                </Tabs>
                <div className="text-right text-xs mt-auto pr-2 font-medium">
                  {runningTotal.type === 'amount' && ( <p className={cn('transition-colors', Math.abs(runningTotal.sum - (Number(watchAmount) || 0)) > 0.01 ? 'text-destructive' : 'text-primary')}> Total: {CURRENCY_SYMBOL}{(Number(runningTotal.sum) || 0).toFixed(2)} / {CURRENCY_SYMBOL}{(Number(watchAmount) || 0).toFixed(2)} </p> )}
                  {runningTotal.type === 'percentage' && ( <p className={cn('transition-colors', Math.abs(runningTotal.sum - 100) > 0.01 ? 'text-destructive' : 'text-primary')}> Total: {(Number(runningTotal.sum) || 0).toFixed(2)}% / 100% </p> )}
                </div>
                 {(errors.participants?.message || (errors.participants as any)?.root?.message) && (
                    <div className="text-center">
                         <FormMessage>{errors.participants?.message?.toString()}</FormMessage>
                         {(errors.participants as any)?.root?.message && <FormMessage>{(errors.participants as any).root.message}</FormMessage>}
                    </div>
                )}
                 <div className="mt-auto pt-2">
                    <Button onClick={onClose} className="w-full">Done</Button>
                </div>
            </div>
        </Panel>
    )
};


// --- Main Form Component ---
interface ExpenseFormProps {
    group: Group;
    closeDialog: () => void;
    isEditing?: boolean;
    isMobile?: boolean;
}

export function ExpenseForm({ group, closeDialog, isEditing = false, isMobile = false }: ExpenseFormProps) {
    const { control, watch, setValue, getValues, formState: { errors, isSubmitting } } = useFormContext<z.infer<typeof expenseSchema>>();
    const { settings } = useSiteSettings();
    const { userProfile } = useAuth();

    const [activePanel, setActivePanel] = useState<null | 'payer' | 'split'>(null);

    const watchDescription = watch("description");
    const watchAmount = watch("amount");
    const watchSplitType = watch("splitType");
    const watchPayerType = watch('payerType');
    const watchSinglePayerId = watch('singlePayerId');
    const watchParticipants = watch('participants');
    
    // Auto-suggest category
    useEffect(() => {
        const currentCategory = getValues("category");
        const { sub: suggestedCategory } = classifyExpense(watchDescription, settings.expenseCategories);
        if(suggestedCategory && suggestedCategory !== currentCategory) {
            setValue("category", suggestedCategory, { shouldValidate: true });
        }
    }, [watchDescription, settings.expenseCategories, getValues, setValue]);

    // Auto-calculate splits - NOW STABLE
    const participantDeps = JSON.stringify(watchParticipants?.map(p => p.selected));
    useEffect(() => {
        const totalAmount = Number(getValues("amount")) || 0;
        const splitType = getValues("splitType");
        const allParticipants = getValues("participants") || [];
        const selectedParticipants = allParticipants.filter((p: any) => p.selected);
        const numSelected = selectedParticipants.length;

        if (totalAmount <= 0 || numSelected === 0) {
            allParticipants.forEach((_: any, index: number) => {
                if (getValues(`participants.${index}.amountOwed`) !== 0) {
                    setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
                }
            });
            return;
        }

        let newAmounts: { [userId: string]: number } = {};

        if (splitType === 'equally') {
            const baseAmount = totalAmount / numSelected;
            const roundedAmounts = selectedParticipants.map(() => parseFloat(baseAmount.toFixed(2)));
            let remainder = parseFloat((totalAmount - roundedAmounts.reduce((s, a) => s + a, 0)).toFixed(2));
            
            for (let i = 0; i < Math.abs(remainder * 100); i++) {
                roundedAmounts[i % numSelected] += 0.01 * Math.sign(remainder);
            }
            selectedParticipants.forEach((p: any, i: number) => { newAmounts[p.userId] = roundedAmounts[i]; });
        } else if (splitType === 'by_shares') {
            const totalShares = selectedParticipants.reduce((sum: number, p: any) => sum + (Number(p.shares) || 1), 0);
            if (totalShares > 0) {
                 selectedParticipants.forEach((p: any) => { newAmounts[p.userId] = (totalAmount * (Number(p.shares) || 1)) / totalShares; });
            }
        } else if (splitType === 'by_percentage') {
            selectedParticipants.forEach((p: any) => { newAmounts[p.userId] = (totalAmount * (Number(p.percentage) || 0)) / 100; });
        }

        allParticipants.forEach((p: any, index: number) => {
            if (p.selected && splitType !== 'unequally') {
                const finalAmount = parseFloat((newAmounts[p.userId] || 0).toFixed(2));
                if (Math.abs((getValues(`participants.${index}.amountOwed`) || 0) - finalAmount) > 1e-9) {
                    setValue(`participants.${index}.amountOwed`, finalAmount, { shouldValidate: true, shouldDirty: true });
                }
            } else if (!p.selected && getValues(`participants.${index}.amountOwed`) !== 0) {
                setValue(`participants.${index}.amountOwed`, 0, { shouldValidate: true });
            }
        });
    }, [watchAmount, watchSplitType, participantDeps, setValue, getValues]);


    const { payerSummary, splitSummary, netChangeSummary } = useMemo(() => {
        const payerType = getValues('payerType');
        const singlePayerId = getValues('singlePayerId');
        const multiPayers = getValues('multiPayers');
        
        let payerText = "you";
        if (payerType === 'single') {
            const payer = group.members.find(m => m.uid === singlePayerId);
            if (payer && payer.uid !== userProfile?.uid) {
                payerText = getFullName(payer.firstName, payer.lastName);
            }
        } else {
            const numPayers = multiPayers?.filter((p:any) => p.amount && p.amount > 0).length || 0;
            payerText = `${numPayers} people`;
        }

        const splitType = getValues('splitType');
        let splitText = "";
        switch (splitType) {
            case 'equally': splitText = "equally"; break;
            case 'unequally': splitText = "unequally"; break;
            case 'by_shares': splitText = "by shares"; break;
            case 'by_percentage': splitText = "by percentage"; break;
        }

        const amount = Number(getValues('amount')) || 0;
        let netChange = 0;
        if (amount > 0) {
            const myShare = getValues('participants').find((p:any) => p.userId === userProfile?.uid)?.amountOwed || 0;
            let iPaid = 0;
            if (payerType === 'single' && singlePayerId === userProfile?.uid) {
                iPaid = amount;
            } else if (payerType === 'multiple') {
                iPaid = getValues('multiPayers')?.find((p:any) => p.userId === userProfile?.uid)?.amount || 0;
            }
            netChange = iPaid - myShare;
        }
        let netText = "";
        if (netChange > 0.01) netText = `You get back ${CURRENCY_SYMBOL}${netChange.toFixed(2)}`;
        if (netChange < -0.01) netText = `You owe ${CURRENCY_SYMBOL}${Math.abs(netChange).toFixed(2)}`;


        return { payerSummary: payerText, splitSummary: splitText, netChangeSummary: netText };
    }, [watchPayerType, watchSinglePayerId, watch('multiPayers'), watchSplitType, watchParticipants, watchAmount, group.members, userProfile, getValues]);


    const category = watch('category');
    const masterCategory = getMasterCategory(category, settings.expenseCategories);
    const categoryDetails = settings.expenseCategories[masterCategory]?.subCategories?.[category];
    
    const categoryIconName = categoryDetails?.icon || 'Wallet';
    const CategoryIcon = Icons[categoryIconName];
    
    return (
        <div className={cn(
            "relative w-full h-full overflow-hidden", 
            isMobile ? "flex flex-col" : "grid"
            )}
            style={!isMobile ? { gridTemplateColumns: "1fr 350px" } : {}}
        >
            <motion.div 
                className="bg-card rounded-l-lg flex flex-col p-6 h-full"
                animate={{ x: activePanel ? (isMobile ? '-100%' : '-350px') : '0%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{isEditing ? "Edit Expense" : "Add an Expense"}</h2>
                    {!activePanel && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDialog}><X className="h-5 w-5"/></Button>}
                </div>
                
                 <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 mb-4">
                     <div className="bg-background/50 p-3 rounded-md">
                        <CategoryIcon className="h-6 w-6 text-foreground" />
                     </div>
                     <div className="flex-1">
                        <FormField control={control} name="description" render={({ field }) => (
                            <Input placeholder="Enter description" {...field} className="text-base font-semibold border-0 bg-transparent shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"/>
                        )} />
                     </div>
                    <FormField control={control} name="amount" render={({ field }) => (
                         <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">{CURRENCY_SYMBOL}</span>
                            <input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="text-right pl-6 text-lg font-bold border-0 bg-transparent shadow-none p-0 h-auto focus-visible:ring-0 w-full outline-none"/>
                        </div>
                    )} />
                 </div>
                 {(errors.description || errors.amount) && <FormMessage className="mt-1 text-center">{(errors.description?.message || errors.amount?.message)?.toString()}</FormMessage>}
                
                <div className="text-center my-2">
                    <p className="text-lg">Paid by <Button variant="link" className="p-0 h-auto text-lg font-bold underline" onClick={() => setActivePanel('payer')}>{payerSummary}</Button> and split <Button variant="link" className="p-0 h-auto text-lg font-bold underline" onClick={() => setActivePanel('split')}>{splitSummary}</Button>.</p>
                    {netChangeSummary && <p className="text-muted-foreground text-xs mt-1">({netChangeSummary})</p>}
                </div>
                
                 <div className="grid grid-cols-2 gap-4 my-4">
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("justify-start text-left font-normal", !watch('date') && "text-muted-foreground")}>
                                <Icons.Calendar className="mr-2 h-4 w-4" />
                                {watch('date') ? format(watch('date'), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={watch('date')} onSelect={(d) => setValue('date', d)} initialFocus /></PopoverContent>
                    </Popover>
                    <FormField control={control} name="category" render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                     <div className="flex items-center gap-2">
                                        <CategoryIcon className="h-4 w-4" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {Object.entries(settings.expenseCategories).map(([masterCat, details]) => {
                                    if (!details || !details.subCategories) return null;
                                    return (
                                        <React.Fragment key={masterCat}>
                                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{masterCat}</p>
                                            {Object.keys(details.subCategories).map(subCat => {
                                                const subDetails = details.subCategories[subCat];
                                                const Icon = subDetails?.icon ? Icons[subDetails.icon] : Icons.Wallet;
                                                return (
                                                    <SelectItem key={subCat} value={subCat}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            <span>{subCat}</span>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </React.Fragment>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    )}/>
                 </div>


                 <div className="flex-1"></div>

                 <div className="mt-auto flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={closeDialog}>Cancel</Button>
                    <Button type="submit" form={isEditing ? "edit-expense-form" : "add-expense-form"} disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                 </div>

            </motion.div>

            {/* Side Panel Area */}
             <AnimatePresence>
                {activePanel === 'payer' && <PayerPanel onClose={() => setActivePanel(null)} />}
                {activePanel === 'split' && <SplitterPanel onClose={() => setActivePanel(null)} />}
             </AnimatePresence>
        </div>
    )
}
