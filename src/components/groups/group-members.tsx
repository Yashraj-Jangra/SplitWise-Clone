
"use client";

import type { UserProfile, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { getFullName, getInitials } from "@/lib/utils";
import { AddMemberDialog } from "./add-member-dialog";
import { useAuth } from "@/contexts/auth-context";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { removeMemberFromGroup } from "@/lib/mock-data";
import { appEventEmitter } from "@/lib/event-emitter";

function MemberActions({ member, group }: { member: UserProfile, group: Group }) {
    const [isRemoving, setIsRemoving] = useState(false);
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
    const { userProfile } = useAuth();
    const { toast } = useToast();

    const handleRemove = async () => {
        if (!userProfile) return;
        
        setIsRemoving(true);
        try {
            await removeMemberFromGroup(group.id, member.uid, userProfile.uid);
            toast({ 
                title: "Member Removed",
                description: `${getFullName(member.firstName, member.lastName)} has been removed from the group.`
            });
            appEventEmitter.emit('data-changed');
        } catch (error) {
            toast({ 
                title: "Could not remove member", 
                description: error instanceof Error ? error.message : "An unknown error occurred.", 
                variant: "destructive" 
            });
        } finally {
            setIsRemoving(false);
            setIsRemoveConfirmOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                        <Icons.MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRemoveConfirmOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Icons.UserMinus className="mr-2 h-4 w-4" />
                        Remove from group
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {getFullName(member.firstName, member.lastName)}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member? They will lose access to this group. This action can only be done if their balance is zero.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemove} disabled={isRemoving} variant="destructive">
                            {isRemoving && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

interface GroupMembersProps {
  members: UserProfile[];
  group: Group;
}

export function GroupMembers({ members, group }: GroupMembersProps) {
  const { userProfile } = useAuth();
  const isCreator = userProfile?.uid === group.createdById;
  const isAdmin = userProfile?.role === 'admin';

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle>Group Members ({members.length})</CardTitle>
            <CardDescription>People sharing expenses in this group.</CardDescription>
        </div>
        {(isCreator || isAdmin) && !group.archivedAt && <AddMemberDialog group={group} />}
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <ScrollArea className="h-[45vh] -mx-6 pr-6">
            <div className="divide-y divide-border/50">
            {members.map((member) => {
                const canRemove = (isCreator || isAdmin) && member.uid !== group.createdById && !group.archivedAt;
                return (
                     <div key={member.uid} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                            <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-medium leading-none">{getFullName(member.firstName, member.lastName)}</p>

                            <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             {member.uid === group.createdById && (
                                <span className="text-xs font-semibold uppercase text-primary/80 tracking-wider">Creator</span>
                             )}
                             {canRemove && <MemberActions member={member} group={group} />}
                        </div>
                    </div>
                )
            })}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
