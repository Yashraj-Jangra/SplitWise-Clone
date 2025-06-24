
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { getGroupsByUserId } from '@/lib/mock-data';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName, getInitials } from '@/lib/utils';

function GroupSkeleton() {
    return (
        <Card className="flex flex-col bg-card/50">
            <CardHeader>
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="pt-4 flex-grow space-y-3">
                <div className="flex -space-x-2 overflow-hidden">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
}

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGroups() {
        if (!userProfile?.uid) return;
        setLoading(true);
        const userGroups = await getGroupsByUserId(userProfile.uid);
        setGroups(userGroups);
        setLoading(false);
    }
    loadGroups();
  }, [userProfile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline text-foreground">My Groups</h1>
          <p className="text-lg text-muted-foreground">Manage your shared expense groups.</p>
        </div>
        <CreateGroupDialog />
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <GroupSkeleton key={i} />)}
        </div>
      ) : groups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col bg-card border-border/50 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                 <CardTitle className="truncate">{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-grow space-y-4">
                 <div className="flex -space-x-2 overflow-hidden">
                    {group.members.slice(0, 5).map(member => (
                        <Avatar key={member.uid} className="inline-block h-8 w-8 rounded-full border-2 border-background">
                            <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                            <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                        </Avatar>
                    ))}
                    {group.members.length > 5 && <Avatar className="h-8 w-8 rounded-full border-2 border-background bg-muted"><AvatarFallback>+{group.members.length - 5}</AvatarFallback></Avatar>}
                 </div>
                 <div className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-bold text-foreground">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</span> total spent
                  </p>
                 </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="secondary">
                  <Link href={`/groups/${group.id}`}>View Group</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full py-12 text-center border-dashed">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Icons.Users className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">No Groups Yet</CardTitle>
            <CardDescription>
              You are not part of any groups. Create one to start sharing expenses!
            </CardDescription>
          </CardHeader>
          <CardContent>
             <CreateGroupDialog buttonVariant="default" buttonSize="lg" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
