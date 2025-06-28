
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Group, UserProfile } from "@/types";
import { getAllUsers, addMembersToGroup } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { getFullName, getInitials } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const addMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, { message: "Select at least one member to add." }),
});

type AddMembersFormValues = z.infer<typeof addMembersSchema>;

interface AddMemberDialogProps {
  group: Group;
  onActionComplete: () => void;
}

export function AddMemberDialog({ group, onActionComplete }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New state for the search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);

  const form = useForm<AddMembersFormValues>({
    resolver: zodResolver(addMembersSchema),
    defaultValues: {
      memberIds: [],
    },
  });

  // Reset state when dialog opens or closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedMembers([]);
      form.reset();
    } else {
      async function loadUsers() {
        setLoading(true);
        const users = await getAllUsers();
        setAllUsers(users);
        setLoading(false);
      }
      loadUsers();
    }
  }, [open, form]);

  const existingMemberIds = useMemo(() => group.members.map(m => m.uid), [group.members]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const selectedMemberIds = selectedMembers.map(m => m.uid);

    return allUsers.filter(user =>
      !existingMemberIds.includes(user.uid) &&
      !selectedMemberIds.includes(user.uid) &&
      (getFullName(user.firstName, user.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
       user.email.toLowerCase().includes(lowerCaseSearchTerm))
    ).slice(0, 5); // Limit results to 5
  }, [searchTerm, allUsers, existingMemberIds, selectedMembers]);

  const handleSelectMember = (member: UserProfile) => {
    const newSelectedMembers = [...selectedMembers, member];
    setSelectedMembers(newSelectedMembers);
    form.setValue('memberIds', newSelectedMembers.map(m => m.uid), { shouldValidate: true });
    setSearchTerm(""); // Clear search input
  };

  const handleRemoveMember = (memberToRemove: UserProfile) => {
    const newSelectedMembers = selectedMembers.filter(m => m.uid !== memberToRemove.uid);
    setSelectedMembers(newSelectedMembers);
    form.setValue('memberIds', newSelectedMembers.map(m => m.uid), { shouldValidate: true });
  };
  
  async function onSubmit(values: AddMembersFormValues) {
    if (!userProfile) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }

    await addMembersToGroup(group.id, values.memberIds, userProfile.uid);

    toast({
      title: "Members Added!",
      description: `${values.memberIds.length} new member(s) added to "${group.name}".`,
    });
    setOpen(false);
    onActionComplete();
    router.refresh();
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
      )
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="memberIds"
            render={() => (
              <FormItem>
                <FormLabel>Search for users</FormLabel>
                <div className="relative">
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                  />
                   <Icons.Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {searchResults.length > 0 && (
                  <div className="border rounded-md mt-1 absolute bg-background z-10 w-full sm:w-[calc(100%-2px)]">
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
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedMembers.length > 0 && (
            <div className="pt-2">
              <FormLabel>Selected members</FormLabel>
              <ScrollArea className="h-32 mt-2">
                <div className="space-y-2 p-2 border rounded-md">
                  {selectedMembers.map(member => (
                    <div key={member.uid} className="flex items-center justify-between p-1 pr-2 rounded-md bg-muted/50">
                       <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                            <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{getFullName(member.firstName, user.lastName)}</span>
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
          )}
           <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting || selectedMembers.length === 0}>
              {form.formState.isSubmitting ? "Adding..." : `Add ${selectedMembers.length} Member(s)`}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icons.UserPlus className="mr-2 h-4 w-4" /> Add Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Add Members to "{group.name}"</DialogTitle>
          <DialogDescription>
            Search for users to invite to this group.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
