
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { createGroup, getAllUsers, getSiteSettings } from "@/lib/api.client";


import type { UserProfile, GroupDocument } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { getFullName, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "../ui/skeleton";

const createGroupSchema = z.object({
  name: z.string().min(3, { message: "Group name must be at least 3 characters." }).max(50, { message: "Group name must be less than 50 characters."}),
  description: z.string().max(200, {message: "Description must be less than 200 characters."}).optional(),
  memberIds: z.array(z.string()).min(1, { message: "Select at least one member (yourself)." }),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateGroupDialog({ buttonVariant, buttonSize, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateGroupDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen;

  const isMobile = useIsMobile();
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New state for search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coversLoading, setCoversLoading] = useState(true);

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      memberIds: userProfile ? [userProfile.uid] : [],
    },
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (userProfile && open) {
      form.reset({
        name: "",
        description: "",
        memberIds: [userProfile.uid],
      });
      setSearchTerm("");
      setSelectedMembers([]);
    }
  }, [userProfile, form, open]);

  // Load users and covers when dialog opens
  useEffect(() => {
    async function loadInitialData() {
        if (open) {
            setLoading(true);
            setCoversLoading(true);
            try {
              const [users, siteSettings] = await Promise.all([
                  getAllUsers(),
                  getSiteSettings()
              ]);
              setAllUsers(users);
              setCoverImages(siteSettings.coverImages);
            } catch (err) {
              console.error("Failed to load initial data for group dialog:", err);
            } finally {
              setLoading(false);
              setCoversLoading(false);
            }
        }
    }
    loadInitialData();
  }, [open]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return allUsers.filter(user =>
      user.uid !== userProfile?.uid &&
      !selectedMembers.some(m => m.uid === user.uid) &&
      (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       getFullName(user.firstName, user.lastName).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allUsers, userProfile, selectedMembers]);

  if (!userProfile) {
    return (
      <Button variant={buttonVariant} size={buttonSize} disabled>
        <Icons.Add className="mr-2 h-4 w-4" /> New Group
      </Button>
    )
  }
  
  const handleSelectMember = (member: UserProfile) => {
    const newSelectedMembers = [...selectedMembers, member];
    setSelectedMembers(newSelectedMembers);
    form.setValue('memberIds', [userProfile.uid, ...newSelectedMembers.map(m => m.uid)], { shouldValidate: true });
    setSearchTerm(""); // Clear search input
  };

  const handleRemoveMember = (memberToRemove: UserProfile) => {
    const newSelectedMembers = selectedMembers.filter(m => m.uid !== memberToRemove.uid);
    setSelectedMembers(newSelectedMembers);
    form.setValue('memberIds', [userProfile.uid, ...newSelectedMembers.map(m => m.uid)], { shouldValidate: true });
  };


  async function onSubmit(values: CreateGroupFormValues) {
    if (!userProfile) {
        toast({ title: "Error", description: "You must be logged in to create a group.", variant: "destructive"});
        return;
    }

    const randomCoverImage = coverImages.length > 0
        ? coverImages[Math.floor(Math.random() * coverImages.length)]
        : 'https://placehold.co/600x400.png';

    const groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses'> = {
        name: values.name,
        description: values.description,
        memberIds: values.memberIds,
        createdById: userProfile.uid,
        coverImageUrl: randomCoverImage,
        currency: "₹",
    };

    try {
        const newGroupId = await createGroup(groupData);
        toast({
          title: "Group Created!",
          description: `The group "${values.name}" has been successfully created.`,
        });
        setOpen(false);
        router.push(`/groups/${newGroupId}`);
        router.refresh();
    } catch(error) {
        toast({ title: "Error", description: "Failed to create group.", variant: "destructive" });
    }
  }

  const dialogTrigger = trigger || (
    <Button variant={buttonVariant} size={buttonSize} className="w-full sm:w-auto">
      <Icons.Add className="mr-2 h-4 w-4" /> New Group
    </Button>
  );

  const FormContent = (
    <FormProvider {...form}>
      <form id="create-group-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Group Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Weekend Trip, Apartment Bills"
                  className="h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal focus:border-primary"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief description of the group's purpose."
                  className="min-h-[72px] rounded-xl bg-muted/20 border-border/30 text-sm font-normal focus:border-primary resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="memberIds"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Add Members</FormLabel>
              <FormDescription className="text-xs text-muted-foreground">Search for users to invite. You are automatically included.</FormDescription>
              <div className="relative">
                <Input
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal pr-9 focus:border-primary"
                  disabled={loading}
                />
                 <Icons.Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {searchResults.length > 0 && (
                <div className="border border-border/40 rounded-xl mt-1.5 shadow-lg bg-card z-20 w-full overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <div
                      key={user.uid}
                      onClick={() => handleSelectMember(user)}
                      className="flex items-center gap-2.5 p-2.5 hover:bg-muted/50 cursor-pointer border-b border-border/20 last:border-b-0 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                        <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{getFullName(user.firstName, user.lastName)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">@{user.username} &bull; {user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-2">
                <FormLabel className="text-xs text-muted-foreground">Selected Members ({selectedMembers.length + 1})</FormLabel>
                <ScrollArea className="h-28 mt-1.5 rounded-xl border border-border/30 bg-muted/10 p-2">
                   <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={userProfile?.avatarUrl} alt={getFullName(userProfile?.firstName, userProfile?.lastName)} />
                            <AvatarFallback>{getInitials(userProfile?.firstName, userProfile?.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{getFullName(userProfile?.firstName, userProfile?.lastName)} (You)</span>
                        </div>
                      </div>
                      {selectedMembers.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                              <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{getFullName(member.firstName, member.lastName)}</p>
                                <p className="text-[10px] text-muted-foreground truncate">@{member.username}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                   </div>
                </ScrollArea>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </FormProvider>
  );

  const ActionFooter = (
    <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-2.5 w-full">
      <Button
        type="button"
        variant="ghost"
        className="w-full sm:w-auto rounded-xl h-10 text-sm font-medium px-4 hover:bg-muted hover:text-foreground transition-colors"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="create-group-form"
        disabled={form.formState.isSubmitting}
        className="w-full sm:w-auto rounded-xl h-10 text-sm font-medium px-5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {form.formState.isSubmitting ? "Creating..." : "Create Group"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{dialogTrigger}</SheetTrigger>}
        <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background">
          <SheetHeader className="p-4 border-b border-border/20">
            <SheetTitle className="text-center text-lg font-semibold">Create a New Group</SheetTitle>
            <SheetDescription className="text-center text-xs">Fill in the details below to start splitting expenses.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              {FormContent}
            </div>
          </ScrollArea>
          <SheetFooter className="p-4 bg-background/50 border-t border-border/20">
            {ActionFooter}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold font-headline text-foreground">Create a New Group</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Fill in the details below to create your expense-sharing group.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-4">
          {FormContent}
        </div>
        <DialogFooter className="p-4 bg-muted/20 border-t border-border/20">
          {ActionFooter}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
