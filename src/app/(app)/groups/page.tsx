
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { getGroupsByUserId, getSiteSettings } from '@/lib/api.client';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { getGroupBalances, simplifyDebts } from '@/lib/api.client';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from 'lucide-react';

function GroupSkeleton() {
    return (
        <div className="aspect-[4/3] w-full">
            <Skeleton className="h-full w-full rounded-2xl" />
        </div>
    )
}

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<(Group & { userNetBalance?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('last_usage');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedSort = localStorage.getItem('splitwise_groups_sort_preference');
    if (savedSort) {
      setSortBy(savedSort);
    }
  }, []);

  const handleSortChange = (value: string) => {
    setSortBy(value);
    localStorage.setItem('splitwise_groups_sort_preference', value);
  };

  useEffect(() => {
    async function loadInitialData() {
        if (!userProfile?.uid) return;
        setLoading(true);
        const [userGroups, siteSettings] = await Promise.all([
          getGroupsByUserId(userProfile.uid),
          getSiteSettings()
        ]);
        
        // Fetch balances for each group to show net position
        const groupsWithBalances = await Promise.all(
            userGroups.map(async (group) => {
                const balances = await getGroupBalances(group.id);
                const userBalance = balances.find(b => b.user.uid === userProfile.uid);
                return {
                    ...group,
                    userNetBalance: userBalance?.netBalance || 0
                };
            })
        );
        
        setGroups(groupsWithBalances);
        setCoverImages(siteSettings.coverImages);
        setLoading(false);
    }
    loadInitialData();
  }, [userProfile]);

  const sortedGroups = [...groups].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'owed_desc':
        return (b.userNetBalance || 0) - (a.userNetBalance || 0);
      case 'owed_asc':
        return (a.userNetBalance || 0) - (b.userNetBalance || 0);
      case 'owes_desc':
        return (a.userNetBalance || 0) - (b.userNetBalance || 0);
      case 'owes_asc':
        return (b.userNetBalance || 0) - (a.userNetBalance || 0);
      case 'last_usage':
      default:
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
    }
  });

  const filteredGroups = sortedGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSortIcon = (sortBy: string) => {
    switch (sortBy) {
      case 'name_asc':
        return <ArrowDownAZ className="h-5 w-5" />;
      case 'name_desc':
        return <ArrowUpAZ className="h-5 w-5" />;
      case 'owed_desc':
        return <ArrowDownWideNarrow className="h-5 w-5 text-green-500" />;
      case 'owed_asc':
        return <ArrowUpNarrowWide className="h-5 w-5 text-green-500" />;
      case 'owes_desc':
        return <ArrowDownWideNarrow className="h-5 w-5 text-red-500" />;
      case 'owes_asc':
        return <ArrowUpNarrowWide className="h-5 w-5 text-red-500" />;
      case 'last_usage':
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">My Groups</h1>
          <p className="text-sm sm:text-lg text-muted-foreground hidden sm:block">Manage your shared expense groups.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {loading ? (
            <>
              <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md flex-1 sm:flex-none" />
              </div>
            </>
          ) : (
            <>
              {/* Search Box */}
              {groups.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/20 border border-border/30 text-sm font-normal focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/55"
                  />
                </div>
              )}

              {/* Action Controls */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                {groups.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 w-10 p-0 flex items-center justify-center shrink-0 [&_svg]:size-5" title="Sort Groups">
                        {getSortIcon(sortBy)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => handleSortChange('last_usage')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'last_usage' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Last Activity</span>
                        {sortBy === 'last_usage' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('name_asc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'name_asc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowDownAZ className="h-4 w-4" /> Name (A-Z)</span>
                        {sortBy === 'name_asc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('name_desc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'name_desc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowUpAZ className="h-4 w-4" /> Name (Z-A)</span>
                        {sortBy === 'name_desc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('owed_desc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'owed_desc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4 text-green-500" /> Owed: High to Low</span>
                        {sortBy === 'owed_desc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('owed_asc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'owed_asc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowUpNarrowWide className="h-4 w-4 text-green-500" /> Owed: Low to High</span>
                        {sortBy === 'owed_asc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('owes_desc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'owes_desc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4 text-red-500" /> Owes: High to Low</span>
                        {sortBy === 'owes_desc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('owes_asc')} className={cn("flex items-center justify-between rounded-lg cursor-pointer focus:bg-muted/40 focus:text-foreground", sortBy === 'owes_asc' && "bg-primary/10 font-medium")}>
                        <span className="flex items-center gap-2"><ArrowUpNarrowWide className="h-4 w-4 text-red-500" /> Owes: Low to High</span>
                        {sortBy === 'owes_asc' && <Icons.Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="flex-1 sm:flex-none">
                  <CreateGroupDialog />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <GroupSkeleton key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <Card className="col-span-full py-16 text-center border-dashed border-border/50 bg-muted/10 animate-in fade-in duration-500">
          <CardHeader>
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce-slow">
                 <Icons.Users className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-headline">
              No Groups Yet
            </CardTitle>
            <CardDescription className="max-w-md mx-auto text-base">
              Groups are where you track shared expenses with roommates, travel buddies, or friends. Create one to get started!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupDialog buttonVariant="default" buttonSize="lg" />
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="col-span-full py-16 text-center border-dashed border-border/50 bg-muted/10 animate-in fade-in duration-500">
          <CardHeader>
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                 <Icons.Search className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-headline">
              No Groups Found
            </CardTitle>
            <CardDescription className="max-w-md mx-auto text-base">
              No groups matching "{searchQuery}". Try a different search term.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGroups.map((group, index) => {
             const net = group.userNetBalance || 0;
             const isOwed = net > 0.01;
             const isDebtor = net < -0.01;
             const isSettled = !isOwed && !isDebtor;
             
             return (
                 <div 
                    key={group.id} 
                    className="animate-in fade-in-0 zoom-in-95" 
                    style={{ animationDelay: `${100 + index * 50}ms`, animationFillMode: 'backwards' }}
                >
                    <Link href={`/groups/${group.id}`} className="group block aspect-[4/3] w-full relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <Image
                            src={group.coverImageUrl || coverImages[0] || 'https://placehold.co/600x400.png'}
                            alt={group.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
                        
                        <div className="relative flex flex-col h-full p-5 text-white justify-between z-10">
                            {/* Top row */}
                            <div className="flex items-start justify-between w-full">
                                <div className="p-2 bg-black/35 rounded-xl backdrop-blur-md border border-white/10 text-white/95 shadow-inner">
                                    <Icons.Users className="h-4 w-4" />
                                </div>
                                
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md border border-white/5",
                                    isOwed ? "bg-green-500/90 text-white" : 
                                    isDebtor ? "bg-red-500/90 text-white" : 
                                    "bg-black/40 text-white/90"
                                )}>
                                    {isOwed && `You're owed ${CURRENCY_SYMBOL}${net.toFixed(2)}`}
                                    {isDebtor && `You owe ${CURRENCY_SYMBOL}${Math.abs(net).toFixed(2)}`}
                                    {isSettled && "Settled up"}
                                </div>
                            </div>

                            {/* Bottom row */}
                            <div className="space-y-3 w-full">
                                <h3 className="text-xl font-bold font-headline drop-shadow-md truncate leading-tight pr-2">
                                    {group.name}
                                </h3>
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex -space-x-2 overflow-visible">
                                    {group.members.slice(0, 5).map(member => (
                                        <Avatar key={member.uid} className="inline-block h-8 w-8 rounded-full ring-2 ring-black/40" title={getFullName(member.firstName, member.lastName)}>
                                            <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                                            <AvatarFallback className="text-foreground text-[10px]">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                    {group.members.length > 5 && (
                                        <Avatar className="h-8 w-8 rounded-full ring-2 ring-black/40 bg-muted/80 text-foreground backdrop-blur-sm text-[10px]">
                                            <AvatarFallback>+{group.members.length - 5}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    </div>
                                    <p className="text-[11px] font-semibold text-white/90 bg-black/45 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                                        {CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)} spent
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
