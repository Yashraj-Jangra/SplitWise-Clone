
"use client";

import type { UserProfile, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { getFullName, getInitials } from "@/lib/utils";
import { AddMemberDialog } from "./add-member-dialog";

interface GroupMembersProps {
  members: UserProfile[];
  group: Group;
  onActionComplete: () => void;
}

export function GroupMembers({ members, group, onActionComplete }: GroupMembersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle>Group Members ({members.length})</CardTitle>
            <CardDescription>People sharing expenses in this group.</CardDescription>
        </div>
        <AddMemberDialog group={group} onActionComplete={onActionComplete}/>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border/50">
            {members.map((member) => (
              <div key={member.uid} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                  <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">{getFullName(member.firstName, member.lastName)}</p>

                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                 {member.uid === group.createdById && (
                    <span className="text-xs font-semibold uppercase text-primary/80 tracking-wider">Creator</span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
