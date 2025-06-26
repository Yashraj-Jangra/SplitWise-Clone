
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { createGroup, getAllUsers } from "@/lib/mock-data";
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
}

export function CreateGroupDialog({ buttonVariant, buttonSize}: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New state for search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);

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

  // Load users when dialog opens
  useEffect(() => {
    async function loadUsers() {
        if (open) {
            setLoading(true);
            const users = await getAllUsers();
            setAllUsers(users);
            setLoading(false);
        }
    }
    loadUsers();
  }, [open]);

  if (!userProfile) {
    return (
      <Button variant={buttonVariant} size={buttonSize} disabled>
        <Icons.Add className="mr-2 h-4 w-4" /> Create New Group
      </Button>
    )
  }
  
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const selectedMemberIds = selectedMembers.map(m => m.uid);

    return allUsers.filter(user =>
      user.uid !== userProfile.uid && // Exclude self
      !selectedMemberIds.includes(user.uid) && // Exclude already selected
      (getFullName(user.firstName, user.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
       user.email.toLowerCase().includes(lowerCaseSearchTerm))
    ).slice(0, 5); // Limit results
  }, [searchTerm, allUsers, userProfile, selectedMembers]);

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

    const groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses'> = {
        name: values.name,
        description: values.description,
        memberIds: values.memberIds,
        createdById: userProfile.uid,
        coverImageUrl: 'https://placehold.co/600x400.png',
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <Icons.Add className="mr-2 h-4 w-4" /> Create New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Create a New Group</DialogTitle>
          <DialogDescription>
            Fill in the details below to create your new expense-sharing group.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekend Trip, Apartment Bills" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of the group's purpose." {...field} />
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
                  <FormLabel>Add Members</FormLabel>
                  <FormDescription>Search for users to invite. You are automatically included.</FormDescription>
                  <div className="relative">
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-8"
                      disabled={loading}
                    />
                     <Icons.Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-md mt-1 absolute bg-background z-10 w-full sm:w-[calc(100%-2rem)]">
                      {searchResults.map(user => (
                        <div
                          key={user.uid}
                          onClick={() => handleSelectMember(user)}
                          className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{getFullName(user.firstName, user.lastName)}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-2 min-h-[9.5rem]">
                    <FormLabel className="text-xs text-muted-foreground">Members to be added</FormLabel>
                    <ScrollArea className="h-32 mt-2">
                       <div className="space-y-2 p-2 border rounded-md">
                          <div className="flex items-center justify-between p-1 pr-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile.avatarUrl} alt={getFullName(userProfile.firstName, userProfile.lastName)} />
                                <AvatarFallback>{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{getFullName(userProfile.firstName, userProfile.lastName)} (You)</span>
                            </div>
                          </div>
                          {selectedMembers.map(member => (
                            <div key={member.uid} className="flex items-center justify-between p-1 pr-2 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                                  <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{getFullName(member.firstName, member.lastName)}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveMember(member)}
                              >
                                <X className="h-4 w-4" />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

