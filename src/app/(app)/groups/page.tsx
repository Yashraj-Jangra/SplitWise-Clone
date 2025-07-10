
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { getGroupsByUserId, getSiteSettings } from '@/lib/mock-data';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName, getInitials } from '@/lib/utils';

function GroupSkeleton() {
    return (
        <div className="aspect-[4/3] w-full">
            <Skeleton className="h-full w-full rounded-md" />
        </div>
    )
}

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverImages, setCoverImages] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitialData() {
        if (!userProfile?.uid) return;
        setLoading(true);
        const [userGroups, siteSettings] = await Promise.all([
          getGroupsByUserId(userProfile.uid),
          getSiteSettings()
        ]);
        setGroups(userGroups);
        setCoverImages(siteSettings.coverImages);
        setLoading(false);
    }
    loadInitialData();
  }, [userProfile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline text-foreground animate-in fade-in slide-in-from-bottom-2 duration-1000">My Groups</h1>
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
          {groups.map((group, index) => (
             <div 
                key={group.id} 
                className="animate-in fade-in-0 zoom-in-95" 
                style={{ animationDelay: `${100 + index * 50}ms`, animationFillMode: 'backwards' }}
            >
                <Link href={`/groups/${group.id}`} className="group block aspect-[4/3] w-full relative rounded-md overflow-hidden shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:ring-2 ring-primary/50">
                    <Image
                        src={group.coverImageUrl || coverImages[0] || 'https://placehold.co/600x400.png'}
                        alt={group.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        data-ai-hint="abstract pattern"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="relative flex flex-col h-full p-6 text-white">
                        <h3 className="text-2xl font-bold font-headline drop-shadow-md truncate">{group.name}</h3>
                        <div className="mt-auto">
                            <div className="flex -space-x-2 overflow-hidden mb-3">
                            {group.members.slice(0, 5).map(member => (
                                <Avatar key={member.uid} className="inline-block h-9 w-9 rounded-full border-2 border-black/50">
                                    <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                                    <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {group.members.length > 5 && <Avatar className="h-9 w-9 rounded-full border-2 border-black/50 bg-muted text-foreground"><AvatarFallback>+{group.members.length - 5}</AvatarFallback></Avatar>}
                            </div>
                            <p className="text-sm text-slate-200 drop-shadow">
                                <span className="font-bold text-white">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</span> total spent
                            </p>
                        </div>
                    </div>
                </Link>
            </div>
          ))}
        </div>
      ) : (
        <Card className="col-span-full py-12 text-center border-dashed border-border/50 glass-pane">
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
