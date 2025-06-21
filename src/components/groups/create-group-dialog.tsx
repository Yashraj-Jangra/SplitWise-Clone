
"use client";

import { useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { mockGroups, mockUsers } from "@/lib/mock-data";
import type { Group, User } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";

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
  const { currentUser } = useAuth();
  
  const form = useForm<CreateGroupFormValues>();

  // Reset form when dialog opens/closes or user changes
  useState(() => {
    if (currentUser) {
      form.reset({
        name: "",
        description: "",
        memberIds: [currentUser.id],
      });
    }
  })

  if (!currentUser) {
    return (
      <Button variant={buttonVariant} size={buttonSize} disabled>
        <Icons.Add className="mr-2 h-4 w-4" /> Create New Group
      </Button>
    )
  }

  const availableMembers = mockUsers.filter(user => user.id !== currentUser.id);

  async function onSubmit(values: CreateGroupFormValues) {
    if (!currentUser) {
        toast({ title: "Error", description: "You must be logged in to create a group.", variant: "destructive"});
        return;
    }

    console.log("Creating group with values:", values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newGroupId = `group${mockGroups.length + 1}`;
    const newGroup: Group = {
      id: newGroupId,
      name: values.name,
      description: values.description,
      members: mockUsers.filter(u => values.memberIds.includes(u.id)),
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      totalExpenses: 0,
      coverImageUrl: `https://placehold.co/600x300.png?text=${encodeURIComponent(values.name)}`,
    };
    mockGroups.push(newGroup);

    toast({
      title: "Group Created!",
      description: `The group "${values.name}" has been successfully created.`,
    });
    setOpen(false);
    form.reset();
    router.push(`/groups/${newGroupId}`);
    router.refresh();
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
                          <Checkbox id={currentUser.id} checked disabled />
                          <Label htmlFor={currentUser.id} className="font-medium text-muted-foreground">
                            {currentUser.name} (You)
                          </Label>
                        </div>
                      {availableMembers.map((member) => (
                        <FormField
                          key={member.id}
                          control={form.control}
                          name="memberIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={member.id}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(member.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), member.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== member.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {member.name}
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
