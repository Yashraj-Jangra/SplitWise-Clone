
"use client";
import type { Group, UserProfile } from "@/types";
import { Icons } from "@/components/icons";
import Image from "next/image";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";
import { updateGroup, getSiteSettings } from "@/lib/mock-data";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "../expenses/add-expense-dialog";


interface GroupDetailHeaderProps {
  group: Group;
  user: UserProfile;
  currentUserBalance: number;
  onActionComplete: () => void;
  onSettingsClick: () => void;
  activeTab: string;
}

export function GroupDetailHeader({ group, user, currentUserBalance, onActionComplete, onSettingsClick, activeTab }: GroupDetailHeaderProps) {
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coversLoading, setCoversLoading] = useState(true);

  useEffect(() => {
    async function loadCovers() {
        if (isPopoverOpen) {
            setCoversLoading(true);
            const settings = await getSiteSettings();
            setCoverImages(settings.coverImages);
            setCoversLoading(false);
        }
    }
    loadCovers();
  }, [isPopoverOpen]);

  const handleCoverChange = async (imageUrl: string) => {
    try {
        await updateGroup(group.id, { coverImageUrl: imageUrl }, user.uid);
        toast({ title: "Cover Image Updated" });
        onActionComplete();
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
        
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          {/* Top Right Actions */}
          <div className="flex self-end items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "text-white hover:bg-white/20 hover:text-white",
                    activeTab === 'settings' && 'bg-white/25'
                )}
                onClick={onSettingsClick}
            >
                <Icons.Settings />
                <span className="sr-only">Settings</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                  <Icons.MoreHorizontal />
                  <span className="sr-only">More Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Popover onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Icons.Edit className="mr-2"/>Change Cover
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    {coversLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-sm" />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {coverImages.map((url, i) => (
                          <button key={i} className="aspect-video relative rounded-sm overflow-hidden group focus:ring-2 focus:ring-primary focus:outline-none" onClick={() => handleCoverChange(url)}>
                            <Image src={url} alt={`Cover option ${i+1}`} fill className="object-cover" />
                            {url === group.coverImageUrl && <div className="absolute inset-0 bg-primary/50 flex items-center justify-center"><Icons.ShieldCheck className="text-white h-6 w-6"/></div>}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"/>
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom Content */}
          <div className="flex flex-row justify-between items-end text-white gap-2">
            {/* Title and Description */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold font-headline drop-shadow-lg">{group.name}</h1>
              <p className="text-sm text-slate-200 drop-shadow-md truncate">{group.description}</p>
            </div>
            {/* Add Expense Button */}
            <div className="flex-shrink-0">
                <AddExpenseDialog group={group} onExpenseAdded={onActionComplete} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Compact Stats Bar */}
      <div className="grid grid-cols-3 divide-x divide-border/50 bg-background/50">
        <div className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="font-bold text-lg">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</p>
        </div>
        <div className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-bold text-lg">{group.members.length}</p>
        </div>
        <div className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Your Balance</p>
            <p className={cn(
                "font-bold text-lg",
                currentUserBalance > 0.01 ? 'text-green-500' : currentUserBalance < -0.01 ? 'text-red-500' : 'text-foreground'
            )}>
                {currentUserBalance >= 0 ? '' : '-'}{CURRENCY_SYMBOL}{Math.abs(currentUserBalance).toFixed(2)}
            </p>
        </div>
      </div>
    </div>
  );
}
