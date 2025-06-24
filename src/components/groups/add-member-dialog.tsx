
"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { getFullName } from "@/lib/utils";

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
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<AddMembersFormValues>({
    resolver: zodResolver(addMembersSchema),
    defaultValues: {
      memberIds: [],
    },
  });
  
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

  const existingMemberIds = group.members.map(m => m.uid);
  // Filter out users who are already members of the group
  const availableUsersToAdd = allUsers.filter(user => !existingMemberIds.includes(user.uid));

  async function onSubmit(values: AddMembersFormValues) {
    await addMembersToGroup(group.id, values.memberIds);

    toast({
      title: "Members Added!",
      description: `${values.memberIds.length} new member(s) added to "${group.name}".`,
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
        {loading ? (
            <div className="space-y-2 py-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        ) : availableUsersToAdd.length > 0 ? (
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
                            key={user.uid}
                            control={form.control}
                            name="memberIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={user.uid}
                                  className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.uid)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), user.uid])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== user.uid
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {getFullName(user.firstName, user.lastName)} ({user.email})
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
            <p>All available users are already in this group.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
