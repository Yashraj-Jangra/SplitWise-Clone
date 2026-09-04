"use client";
import type { Group, UserProfile, Expense } from "@/types";
import { Icons } from "@/components/icons";
import Image from "next/image";
import { getGroupCurrencySymbol, CURRENCY_SYMBOL } from "@/lib/constants";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";
import { updateGroup, getSiteSettings } from "@/lib/api.client";
import { calculateGroupBudgetStats } from "@/lib/budget-utils";


import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "../expenses/add-expense-dialog";
import { AddSettlementDialog } from "../settlements/add-settlement-dialog";
import { motion } from "framer-motion";

interface GroupDetailHeaderProps {
  group: Group;
  user: UserProfile;
  currentUserBalance: number;
  expenses?: Expense[];
  onNavigateToBudget?: () => void;
  settlementOpen?: boolean;
  onSettlementOpenChange?: (open: boolean) => void;
  initialSettlement?: any;
  activityFilter?: 'all' | 'expenses' | 'settlements';
  onActivityFilterChange?: (filter: 'all' | 'expenses' | 'settlements') => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  activityCounts?: { all: number; expenses: number; settlements: number };
}

export function GroupDetailHeader({
  group,
  user,
  currentUserBalance,
  expenses = [],
  onNavigateToBudget,
  settlementOpen,
  onSettlementOpenChange,
  initialSettlement,
  activityFilter,
  onActivityFilterChange,
  activeTab,
  onSelectTab,
  activityCounts,
}: GroupDetailHeaderProps) {
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coversLoading, setCoversLoading] = useState(true);

  const budgetStats = useMemo(() => {
    return calculateGroupBudgetStats(group, expenses);
  }, [group, expenses]);

  // Fetch cover images only when the popover is about to open
  useEffect(() => {
    async function loadCovers() {
        if (isPopoverOpen) {
            setCoversLoading(true);
            try {
                const settings = await getSiteSettings();
                setCoverImages(settings.coverImages);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load cover images.' });
            } finally {
                setCoversLoading(false);
            }
        }
    }
    loadCovers();
  }, [isPopoverOpen, toast]);

  const handleCoverChange = async (imageUrl: string) => {
    try {
        await updateGroup(group.id, { coverImageUrl: imageUrl }, user.uid);
        toast({ title: "Cover Image Updated" });
        setIsPopoverOpen(false); // Close popover on selection
    } catch(e) {
        toast({ title: "Error", description: "Failed to update cover image", variant: "destructive"});
    }
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Cover Image and Overlay Content */}
      <div className="relative h-32 md:h-40 w-full">
        <Image
          src={group.coverImageUrl || 'https://placehold.co/1200x300.png'}
          alt={`${group.name} cover image`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        
        {/* Actions - Always visible for mobile-friendliness */}
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
            {!group.archivedAt && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white bg-black/30 hover:bg-black/50 hover:text-white">
                        <Icons.Edit className="h-4 w-4" />
                        <span className="sr-only">Change Cover</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                    {coversLoading ? (
                        <div className="grid grid-cols-3 gap-2">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-sm" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {coverImages.map((url, i) => (
                                <button key={i} className="aspect-video relative rounded-sm overflow-hidden group/image focus:ring-2 focus:ring-primary focus:outline-none" onClick={() => handleCoverChange(url)}>
                                    <Image src={url} alt={`Cover option ${i+1}`} fill className="object-cover" />
                                    {url === group.coverImageUrl && <div className="absolute inset-0 bg-primary/50 flex items-center justify-center"><Icons.ShieldCheck className="text-white h-6 w-6"/></div>}
                                    <div className="absolute inset-0 bg-black/20 group-hover/image:bg-black/40 transition-colors"/>
                                </button>
                            ))}
                        </div>
                    )}
                </PopoverContent>
            </Popover>
            )}
        </div>


        {/* Group name + description — top-left on mobile, bottom-left on desktop */}
        <div className="absolute top-2 left-2 right-16 md:top-auto md:bottom-3 md:left-4 md:right-auto md:max-w-[calc(100%-250px)] z-10">
          <h1 className="text-xl md:text-3xl font-bold font-headline drop-shadow-lg truncate text-white leading-tight">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-xs md:text-sm text-slate-200 drop-shadow-md truncate mt-0.5">{group.description}</p>
          )}
        </div>

        {/* Action Buttons — bottom-right */}
        {!group.archivedAt && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="inline-flex rounded-md shadow-sm">
              <AddExpenseDialog
                group={group}
                trigger={
                  <Button size="sm" className="rounded-r-none border-r border-primary/70">
                    <Icons.Add className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Add Expense</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                }
              />
              <AddSettlementDialog
                group={group}
                open={settlementOpen}
                onOpenChange={onSettlementOpenChange}
                initialSettlement={initialSettlement}
                trigger={
                  <Button size="sm" className="rounded-l-none">
                    <Icons.Settle className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Settle</span>
                    <span className="sm:hidden">Settle</span>
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Compact Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border bg-card">
        <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Spent</p>
            <p className="font-bold font-mono text-base sm:text-lg text-foreground">{getGroupCurrencySymbol(group)}{group.totalExpenses.toFixed(2)}</p>
        </div>
        <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Members</p>
            <p className="font-bold font-mono text-base sm:text-lg text-foreground">{group.members.length}</p>
        </div>
        <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Balance</p>
            <p className={cn(
                "font-bold font-mono text-base sm:text-lg",
                currentUserBalance > 0.01 ? 'text-emerald-400' : currentUserBalance < -0.01 ? 'text-rose-400' : 'text-foreground'
            )}>
                {currentUserBalance >= 0 ? '' : '-'}{getGroupCurrencySymbol(group)}{Math.abs(currentUserBalance).toFixed(2)}
            </p>
        </div>
        <div
          className="p-2.5 sm:p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors group/budget"
          onClick={onNavigateToBudget}
          title="View Budget Details"
        >
            <div className="flex items-center justify-center gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Budget</p>
            </div>
            {budgetStats.isEnabled ? (
              <p className={cn(
                "font-bold font-mono text-base sm:text-lg truncate",
                budgetStats.status === 'healthy' && "text-emerald-400",
                budgetStats.status === 'caution' && "text-amber-400",
                budgetStats.status === 'warning' && "text-orange-400",
                budgetStats.status === 'overbudget' && "text-rose-400",
              )}>
                {budgetStats.percentageUsed.toFixed(0)}%
                <span className="text-[11px] font-normal text-muted-foreground ml-1">
                  ({CURRENCY_SYMBOL}{budgetStats.remainingBudget >= 0 ? `${(budgetStats.remainingBudget / 1000).toFixed(1)}k` : 'over'})
                </span>
              </p>
            ) : (
              <p className="text-xs font-bold uppercase tracking-wider text-foreground pt-1 group-hover/budget:underline">
                + Set Budget
              </p>
            )}
        </div>
      </div>

      {/* Sleek Activity Filter Sub-Bar */}
      {activityFilter && onActivityFilterChange && (
        <div className="border-t border-border/30 bg-muted/20 dark:bg-muted/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Icons.History className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
              <span className="font-semibold text-foreground tracking-tight">Activity</span>
              {activityCounts !== undefined && (
                <span className="text-[10px] text-muted-foreground/70 font-mono hidden xs:inline">
                  ({activityFilter === 'expenses' ? activityCounts.expenses : activityFilter === 'settlements' ? activityCounts.settlements : activityCounts.all} records)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center bg-muted/70 dark:bg-muted/40 p-0.5 rounded-lg border border-border/40 text-xs shrink-0 ml-auto">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'expenses', label: 'Expenses' },
                { value: 'settlements', label: 'Settlements' },
              ] as const
            ).map((opt) => {
              const isSelected = activityFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onActivityFilterChange(opt.value);
                    if (onSelectTab && activeTab !== 'expenses') {
                      onSelectTab('expenses');
                    }
                  }}
                  className={cn(
                    'relative px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    isSelected
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="header-activity-filter-pill"
                      className="absolute inset-0 bg-background dark:bg-zinc-800 rounded-md shadow-xs border border-border/60"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
