'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { Group, Balance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { updateGroup, getGroupBalances, archiveGroup } from '@/lib/mock-data';
import { GroupMembers } from './group-members';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { appEventEmitter } from '@/lib/event-emitter';
import { getFullName } from '@/lib/utils';


const settingsSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description too long.").optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface GroupSettingsTabProps {
  group: Group;
}

export function GroupSettingsTab({ group }: GroupSettingsTabProps) {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      const b = await getGroupBalances(group.id);
      setBalances(b);
    }
    fetchBalances();
  }, [group.id]);
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: group.name,
      description: group.description || "",
    },
  });
  
  const isCreator = userProfile?.uid === group.createdById;
  const isSettled = balances.every(b => Math.abs(b.netBalance) < 0.01);
  const isArchived = !!group.archivedAt;

  async function onSubmit(values: SettingsFormValues) {
    if (!userProfile) return;
    try {
      await updateGroup(group.id, values, userProfile.uid);
      toast({ title: "Group Updated", description: "The group details have been saved." });
      appEventEmitter.emit('data-changed');
    } catch (error) {
      toast({ title: "Error", description: "Failed to update group.", variant: "destructive" });
    }
  }

  const handleArchiveRequest = () => {
    if (!isSettled) {
      // This state should not be reachable if the button is disabled, but as a fallback.
      toast({
        variant: 'destructive',
        title: 'Cannot Archive Group',
        description: 'All debts must be settled before you can archive the group.',
      });
      return;
    }
    if (!isCreator) {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: `Only the group creator, ${getFullName(group.createdBy.firstName, group.createdBy.lastName)}, can archive this group.`,
      });
      return;
    }
    // If all checks pass, open the confirmation dialog
    setIsDeleteDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!userProfile) return;
    setIsDeleting(true);
    try {
      await archiveGroup(group.id, userProfile.uid);
      toast({ title: "Group Archived", description: `The group "${group.name}" has been archived and is now read-only.`});
      router.push('/groups');
      appEventEmitter.emit('data-changed');
      router.refresh();
    } catch(error) {
       toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to archive group.", variant: "destructive"});
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update your group's name and description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl><Input {...field} disabled={isArchived} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Description</FormLabel>
                    <FormControl><Textarea {...field} disabled={isArchived} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={!isCreator || form.formState.isSubmitting || isArchived}>
                {form.formState.isSubmitting && <Icons.AppLogo className="mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <GroupMembers members={group.members} group={group} />
      
      {!isArchived && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={isSettled ? -1 : 0}>
                            <Button
                                variant="destructive"
                                onClick={handleArchiveRequest}
                                disabled={!isSettled}
                            >
                                Archive Group
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {!isSettled && (
                        <TooltipContent>
                            <p>All debts must be settled before this group can be archived.</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Archive this group?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Archiving this group will make it read-only for all members. After 30 days, the group and all its data will be permanently deleted. This action cannot be undone. Are you sure?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveConfirm} disabled={isDeleting} variant="destructive">
                      {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                      Yes, archive it
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
