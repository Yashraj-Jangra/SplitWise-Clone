
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { getGroupsByUserId } from '@/lib/mock-data';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

function GroupSkeleton() {
    return (
        <Card className="flex flex-col">
            <CardHeader className="relative p-0 h-40">
                <Skeleton className="h-full w-full rounded-t-lg" />
            </CardHeader>
            <CardContent className="pt-4 flex-grow space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
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
          <h1 className="text-3xl font-bold font-headline text-foreground">My Groups</h1>
          <p className="text-muted-foreground">Manage your shared expense groups or create a new one.</p>
        </div>
        <CreateGroupDialog />
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <GroupSkeleton key={i} />)}
        </div>
      ) : groups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="relative p-0 h-40">
                <Image
                  src={group.coverImageUrl || `https://placehold.co/600x300.png?text=${encodeURIComponent(group.name)}`}
                  alt={group.name}
                  fill
                  objectFit="cover"
                  className="rounded-t-xl"
                  data-ai-hint="group event"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-t-xl"></div>
                 <CardTitle className="absolute bottom-4 left-4 text-xl font-headline text-white">
                    {group.name}
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                <CardDescription className="mb-2 h-10 overflow-hidden text-ellipsis">
                  {group.description || "No description provided."}
                </CardDescription>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center">
                    <Icons.Users className="h-4 w-4 mr-2" /> {group.members.length} members
                  </p>
                  <p className="flex items-center">
                    <Icons.Currency className="h-4 w-4 mr-2" /> Total Expenses: {CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/groups/${group.id}`}>View Group</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full py-12 text-center">
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
