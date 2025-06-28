
"use client";
import type { Group, UserProfile } from "@/types";
import { Icons } from "@/components/icons";
import Image from "next/image";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { archiveGroupAction } from "@/lib/actions/group";
import { updateGroup, getSiteSettings, getGroupBalances } from "@/lib/mock-data";
import { uploadFile } from "@/lib/storage";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "../expenses/add-expense-dialog";


interface GroupDetailHeaderProps {
  group: Group;
  user: UserProfile;
  currentUserBalance: number;
  onActionComplete: () => void;
}

function StatCard({ icon, label, value, valueClassName }: { icon: React.ReactNode, label: string, value: string, valueClassName?: string }) {
    return (
        <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
            <div className="text-primary">{icon}</div>
            <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={cn("text-base font-bold text-foreground", valueClassName)}>{value}</div>
            </div>
        </div>
    )
}

export function GroupDetailHeader({ group, user, currentUserBalance, onActionComplete }: GroupDetailHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coversLoading, setCoversLoading] = useState(true);
  
  const [balances, setBalances] = useState<any[]>([]);
  useEffect(() => {
    async function fetchBalances() {
      const b = await getGroupBalances(group.id);
      setBalances(b);
    }
    fetchBalances();
  }, [group.id]);

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

  const isCreator = user.uid === group.createdById;
  const isSettled = balances.every(b => Math.abs(b.netBalance) < 0.01);

  const handleArchive = async () => {
    setIsDeleting(true);
    const result = await archiveGroupAction(group.id, user.uid);
    if (result.success) {
      toast({ title: "Group Archived", description: `The group "${group.name}" has been archived and is now read-only.`});
      router.push('/groups');
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive"});
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  }

  const handleCoverChange = async (imageUrl: string) => {
    try {
        await updateGroup(group.id, { coverImageUrl: imageUrl });
        toast({ title: "Cover Image Updated" });
        onActionComplete();
    } catch(e) {
        toast({ title: "Error", description: "Failed to update cover image", variant: "destructive"});
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
        return;
    }
    const file = e.target.files[0];
    
    if (file.size > 1024 * 1024 * 5) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: "Please select an image smaller than 5MB." });
        return;
    }

    setIsUploading(true);
    try {
        const downloadURL = await uploadFile(file, `group-covers/${group.id}`);
        await updateGroup(group.id, { coverImageUrl: downloadURL });
        toast({ title: "Cover Image Updated", description: "Your new cover image has been saved." });
        onActionComplete(); 
    } catch (error) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload your image. Please try again." });
    } finally {
        setIsUploading(false);
    }
  };


  const archiveButtonMenuItem = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!isSettled || isDeleting}
              className="text-red-600 focus:text-red-600"
            >
              <Icons.Delete className="mr-2 h-4 w-4" />
              Archive Group
            </DropdownMenuItem>
          </div>
        </TooltipTrigger>
        {!isSettled && (
          <TooltipContent>
            <p>You can only archive a group once all debts are settled.</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      <div className="relative w-full rounded-lg overflow-hidden border border-border/50">
        {/* Cover Image */}
        <div className="relative h-32 md:h-48 w-full">
            <Image
                src={group.coverImageUrl || 'https://placehold.co/1200x300.png'}
                alt={`${group.name} cover image`}
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        </div>
        
        {/* Content */}
        <div className="p-4 bg-background">
            {/* Title, Actions, and Description */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline text-foreground">{group.name}</h1>
                    <p className="text-muted-foreground text-sm mt-1">{group.description}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <AddExpenseDialog group={group} onExpenseAdded={onActionComplete} />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/png, image/jpeg, image/gif" />
                                    <Button 
                                        variant="ghost" 
                                        className="w-full mt-2" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Icons.AppLogo className="mr-2 animate-spin" /> : <Icons.Upload className="mr-2" />}
                                        {isUploading ? 'Uploading...' : 'Upload Custom'}
                                    </Button>
                                </PopoverContent>
                            </Popover>
                            {isCreator && (
                                <>
                                <DropdownMenuSeparator />
                                {archiveButtonMenuItem}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Bar */}
             <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard 
                    icon={<Icons.Currency />} 
                    label="Total Spent" 
                    value={`${CURRENCY_SYMBOL}${group.totalExpenses.toFixed(2)}`}
                />
                 <StatCard 
                    icon={<Icons.Users />} 
                    label="Members" 
                    value={`${group.members.length}`}
                />
                 <StatCard 
                    icon={<Icons.Wallet />} 
                    label="Your Balance" 
                    value={`${currentUserBalance >= 0 ? '' : '-'}${CURRENCY_SYMBOL}${Math.abs(currentUserBalance).toFixed(2)}`}
                    valueClassName={currentUserBalance > 0.01 ? 'text-green-500' : currentUserBalance < -0.01 ? 'text-red-500' : 'text-foreground'}
                />
            </div>
        </div>
      </div>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Archive this group?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Archiving this group will remove all members' access, including your own. The group and its history will be preserved for administrative review but will not be accessible to members. Are you sure?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                      Yes, archive it
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
