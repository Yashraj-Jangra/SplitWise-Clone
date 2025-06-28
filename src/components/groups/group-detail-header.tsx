
"use client";
import type { Group, UserProfile, Balance } from "@/types";
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
import { updateGroup, getSiteSettings } from "@/lib/mock-data";
import { uploadFile } from "@/lib/storage";
import { Skeleton } from "../ui/skeleton";


interface GroupDetailHeaderProps {
  group: Group;
  user: UserProfile;
  balances: Balance[];
  onActionComplete: () => void;
}

export function GroupDetailHeader({ group, user, balances, onActionComplete }: GroupDetailHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      <div className="relative p-6 bg-card rounded-md border border-border/50 overflow-hidden">
          <Image
            src={group.coverImageUrl || 'https://placehold.co/1200x300.png'}
            alt={`${group.name} cover image`}
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          
          <div className="relative flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline text-foreground mb-1">{group.name}</h1>
                  <p className="text-muted-foreground max-w-prose">{group.description}</p>
                   <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <Icons.Users className="h-4 w-4 mr-2" />
                            <span>{group.members.length} Members</span>
                        </div>
                        <div className="font-semibold text-foreground flex items-center">
                            <Icons.Currency className="h-4 w-4 mr-2" />
                            <span>Total Expenses: {CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</span>
                        </div>
                    </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
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
