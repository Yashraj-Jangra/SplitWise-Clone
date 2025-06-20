"use client";

import { useState } from "react";
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
import type { Group, User } from "@/types";
import { mockUsers, mockGroups } from "@/lib/mock-data"; // For simulation
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const addMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, { message: "Select at least one member to add." }),
});

type AddMembersFormValues = z.infer<typeof addMembersSchema>;

interface AddMemberDialogProps {
  group: Group;
}

export function AddMemberDialog({ group }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const existingMemberIds = group.members.map(m => m.id);
  // Filter out users who are already members of the group
  const availableUsersToAdd = mockUsers.filter(user => !existingMemberIds.includes(user.id));

  const form = useForm<AddMembersFormValues>({
    resolver: zodResolver(addMembersSchema),
    defaultValues: {
      memberIds: [],
    },
  });

  async function onSubmit(values: AddMembersFormValues) {
    console.log(`Adding members to group ${group.name}:`, values.memberIds);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const membersToAdd = mockUsers.filter(u => values.memberIds.includes(u.id));
    
    // Update mock group data
    const groupToUpdate = mockGroups.find(g => g.id === group.id);
    if (groupToUpdate) {
      groupToUpdate.members.push(...membersToAdd);
    }

    toast({
      title: "Members Added!",
      description: `${membersToAdd.length} new member(s) added to "${group.name}".`,
    });
    setOpen(false);
    form.reset();
    router.refresh(); // Refresh server components to show updated member list
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
            Select users to add to this group.
          </DialogDescription>
        </DialogHeader>
        {availableUsersToAdd.length > 0 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Available Users</FormLabel>
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                      <div className="space-y-2">
                        {availableUsersToAdd.map((user) => (
                          <FormField
                            key={user.id}
                            control={form.control}
                            name="memberIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={user.id}
                                  className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), user.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== user.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {user.name} ({user.email})
                                  </FormLabel>
                                </FormItem>
                              );
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Adding..." : "Add Selected Members"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Icons.Users className="h-12 w-12 mx-auto mb-3" />
            <p>All available users are already in