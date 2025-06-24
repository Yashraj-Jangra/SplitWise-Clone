
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { getFullName } from "@/lib/utils";

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
  
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      memberIds: userProfile ? [userProfile.uid] : [],
    },
  });

  useEffect(() => {
    if (userProfile && open) {
      form.reset({
        name: "",
        description: "",
        memberIds: [userProfile.uid],
      });
    }
  }, [userProfile, form, open]);

  useEffect(() => {
    async function loadUsers() {
        if (open) {
            const users = await getAllUsers();
            setAllUsers(users);
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

  const availableMembers = allUsers.filter(user => user.uid !== userProfile.uid);

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
        coverImageUrl: `https://placehold.co/600x300.png?text=${encodeURIComponent(values.name)}`,
    };

    try {
        const newGroupId = await createGroup(groupData);
        toast({
          title: "Group Created!",
          description: `The group "${values.name}" has been successfully created.`,
        });
        setOpen(false);
        form.reset({
          name: "",
          description: "",
          memberIds: [userProfile.uid],
        });
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
                  <FormDescription>Select members to add to this group. You are automatically included.</FormDescription>
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    <div className="space-y-2">
                       <div className="flex items-center space-x-2">
                          <Checkbox id={userProfile.uid} checked disabled />
                          <Label htmlFor={userProfile.uid} className="font-medium text-muted-foreground">
                            {getFullName(userProfile.firstName, userProfile.lastName)} (You)
                          </Label>
                        </div>
                      {availableMembers.map((member) => (
                        <FormField
                          key={member.uid}
                          control={form.control}
                          name="memberIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={member.uid}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(member.uid)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), member.uid])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== member.uid
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {getFullName(member.firstName, member.lastName)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
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
