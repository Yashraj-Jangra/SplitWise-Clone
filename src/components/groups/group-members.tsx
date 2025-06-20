
"use client";

import type { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";

interface GroupMembersProps {
  members: User[];
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

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
              <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                {/* Add action button if needed e.g. remove member */}
                {/* <Button variant="ghost" size="icon" className="h-8 w-8"><Icons.MoreHorizontal /></Button> */}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
