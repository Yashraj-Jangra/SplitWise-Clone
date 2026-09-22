"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Receipt, HandCoins, Users, Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { getGroupsByUserId } from "@/lib/api.client";
import { appEventEmitter } from "@/lib/event-emitter";
import { getInitials } from "@/lib/utils";
import type { Group } from "@/types";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AddSettlementDialog } from "@/components/settlements/add-settlement-dialog";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";

interface GlobalQuickActionsProps {
  /** If provided, renders this trigger instead of the default header '+' button */
  trigger?: React.ReactNode;
  /** If set, clicking trigger immediately prompts for this action without the dropdown */
  directAction?: "expense" | "settlement" | "group";
}

export function GlobalQuickActions({ trigger, directAction }: GlobalQuickActionsProps) {
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsFetched, setGroupsFetched] = useState(false);

  // Active dialog states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"expense" | "settlement" | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);

  // Group search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGroups = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoadingGroups(true);
    try {
      const userGroups = await getGroupsByUserId(userProfile.uid);
      setGroups(userGroups);
      setGroupsFetched(true);
    } catch (err) {
      console.error("Failed to load user groups for quick actions:", err);
    } finally {
      setLoadingGroups(false);
    }
  }, [userProfile?.uid]);

  // Keep groups fresh on real-time data changes
  useEffect(() => {
    if (userProfile?.uid) {
      fetchGroups();
    }
    appEventEmitter.on("data-changed", fetchGroups);
    return () => {
      appEventEmitter.off("data-changed", fetchGroups);
    };
  }, [fetchGroups, userProfile?.uid]);

  const handleActionSelect = (action: "expense" | "settlement" | "group") => {
    if (action === "group") {
      setCreateGroupDialogOpen(true);
      return;
    }

    // If user has only 1 group, bypass picker and open directly
    if (groups.length === 1) {
      setSelectedGroup(groups[0]);
      if (action === "expense") {
        setExpenseDialogOpen(true);
      } else {
        setSettlementDialogOpen(true);
      }
      return;
    }

    // If 0 groups, prompt to create group first
    if (groups.length === 0 && groupsFetched) {
      setCreateGroupDialogOpen(true);
      return;
    }

    // Multiple groups -> open sleek group picker
    setPendingAction(action);
    setSearchQuery("");
    setPickerOpen(true);
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setPickerOpen(false);

    if (pendingAction === "expense") {
      setExpenseDialogOpen(true);
    } else if (pendingAction === "settlement") {
      setSettlementDialogOpen(true);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase().trim();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        (g.description && g.description.toLowerCase().includes(query))
    );
  }, [groups, searchQuery]);

  // Group picker body content
  const groupPickerBody = (
    <div className="p-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder="Search your groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/20 border-border/30 text-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
          autoFocus
        />
      </div>

      <ScrollArea className="max-h-[300px] sm:max-h-[340px] pr-2">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <Users className="h-8 w-8 mx-auto opacity-30" />
            <p className="text-sm font-medium">No matching groups</p>
            <p className="text-xs text-muted-foreground/70">
              Try searching with another name or create a new group.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredGroups.map((group) => {
              const memberCount = group.members?.length || 0;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupSelect(group)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/40 hover:bg-muted/50 hover:border-border/60 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 rounded-xl border border-border/40 shrink-0">
                      <AvatarImage src={group.coverImageUrl} alt={group.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs rounded-xl">
                        {getInitials(group.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Trigger: Direct Action Button OR Global Dropdown */}
      {directAction ? (
        trigger ? (
          <span onClick={() => handleActionSelect(directAction)} className="cursor-pointer inline-flex">
            {trigger}
          </span>
        ) : null
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {trigger || (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-border/40 bg-background/60 hover:bg-muted/60 transition-colors shadow-xs"
                aria-label="Quick Actions"
                title="Quick Actions"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Quick Actions</span>
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/30 p-1.5 shadow-xl">
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
              Quick Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleActionSelect("expense")}
              className="rounded-lg gap-2.5 py-2 cursor-pointer font-medium text-sm focus:bg-primary/10 focus:text-primary"
            >
              <Receipt className="h-4 w-4 text-primary shrink-0" />
              <span>Record Expense</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleActionSelect("settlement")}
              className="rounded-lg gap-2.5 py-2 cursor-pointer font-medium text-sm focus:bg-primary/10 focus:text-primary"
            >
              <HandCoins className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Record Settlement</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem
              onClick={() => handleActionSelect("group")}
              className="rounded-lg gap-2.5 py-2 cursor-pointer font-medium text-sm focus:bg-primary/10 focus:text-primary"
            >
              <Users className="h-4 w-4 text-blue-500 shrink-0" />
              <span>Create Group</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Group Picker Modal: Desktop Glass-Pane vs Mobile Bottom Sheet */}
      {isMobile ? (
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
          <SheetContent
            side="bottom"
            className="h-[80vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background"
          >
            <SheetHeader className="p-6 pb-2 text-left border-b border-border/20">
              <SheetTitle className="text-xl font-bold font-headline">
                {pendingAction === "expense" ? "Record Expense" : "Record Settlement"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Select a group to record this transaction in.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">{groupPickerBody}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
            <DialogHeader className="p-6 pb-2 text-left border-b border-border/20">
              <DialogTitle className="text-xl font-bold font-headline">
                {pendingAction === "expense" ? "Record Expense" : "Record Settlement"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select a group to record this transaction in.
              </DialogDescription>
            </DialogHeader>
            {groupPickerBody}
          </DialogContent>
        </Dialog>
      )}

      {/* Embedded Dialogs spawned after group selection */}
      {selectedGroup && (
        <>
          <AddExpenseDialog
            group={selectedGroup}
            open={expenseDialogOpen}
            onOpenChange={setExpenseDialogOpen}
            onExpenseAdded={() => {
              setExpenseDialogOpen(false);
              setSelectedGroup(null);
            }}
          />
          <AddSettlementDialog
            group={selectedGroup}
            open={settlementDialogOpen}
            onOpenChange={setSettlementDialogOpen}
          />
        </>
      )}

      {/* Standalone Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
      />
    </>
  );
}
