
"use client";

import type { UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { getFullName, getInitials } from "@/lib/utils";

interface GroupMembersProps {
  members: UserProfile[];
}

export function GroupMembers({ members }: GroupMembersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <Icons.Users className="h-5 w-5 mr-2 text-primary" />
            Group Members ({members.length})
        </CardTitle>
        <CardDescription>People sharing expenses in this group.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]"> {/* Adjust height as needed */}
          <div className="divide-y">
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
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
