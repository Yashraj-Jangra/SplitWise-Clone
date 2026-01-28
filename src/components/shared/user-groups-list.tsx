
'use client';

import { useState, useEffect } from 'react';
import type { Group } from '@/types';
import { getGroupsByUserId } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { getInitials } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';

interface UserGroupsListProps {
  userId: string;
}

const INITIAL_VISIBLE_GROUPS = 5;

export function UserGroupsList({ userId }: UserGroupsListProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      const fetchGroups = async () => {
        setLoading(true);
        try {
          const userGroups = await getGroupsByUserId(userId);
          setGroups(userGroups);
        } catch (error) {
          console.error("Failed to fetch user's groups:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGroups();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 sm:w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full sm:w-3/4" />
                <Skeleton className="h-3 w-2/3 sm:w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Icons.Users className="h-5 w-5 mr-2 text-primary" />
                    Group Memberships
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">This user is not a member of any groups.</p>
            </CardContent>
        </Card>
    );
  }
  
  const visibleGroups = groups.slice(0, INITIAL_VISIBLE_GROUPS);
  const hiddenGroups = groups.slice(INITIAL_VISIBLE_GROUPS);

  const GroupListItem = ({ group }: { group: Group }) => (
    <Link href={`/groups/${group.id}`} className="block p-3 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={group.coverImageUrl} alt={group.name} />
                    <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-medium">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
        </div>
    </Link>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.Users className="h-5 w-5 mr-2 text-primary" />
          Group Memberships ({groups.length})
        </CardTitle>
        <CardDescription>A list of all groups this user is a part of.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
            {visibleGroups.map(group => <GroupListItem key={group.id} group={group} />)}
        </div>
        {hiddenGroups.length > 0 && (
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1" className="border-b-0 px-3">
                    <AccordionTrigger className="py-2 text-sm font-medium text-primary hover:no-underline">
                        Show {hiddenGroups.length} more groups
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="divide-y">
                             {hiddenGroups.map(group => <GroupListItem key={group.id} group={group} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
