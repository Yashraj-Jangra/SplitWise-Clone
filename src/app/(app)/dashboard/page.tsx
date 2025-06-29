
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from "next/link";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { BalanceOverviewSummary } from "@/components/dashboard/balance-overview-summary";
import { Icons } from "@/components/icons";
import { getGroupsByUserId } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile, Group } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getFullName, getInitials } from '@/lib/utils';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { DashboardAddExpenseButton } from '@/components/expenses/dashboard-add-expense-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    async function getDashboardData(userId: string) {
      setGroupsLoading(true);
      try {
        const userGroups = await getGroupsByUserId(userId);
        setGroups(userGroups);
      } catch (error: any) {
        console.error("Failed to fetch dashboard groups:", error);
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: "Could not load your groups.",
        });
      } finally {
        setGroupsLoading(false);
      }
    }

    if (userProfile?.uid) {
      getDashboardData(userProfile.uid);
    }
  }, [userProfile, toast]);

  if (loading || !userProfile || groupsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground tracking-tighter">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Welcome back, {userProfile.firstName}!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <BalanceOverviewSummary currentUserId={userProfile.uid} />
            <RecentActivityList />
        </div>

        <div className="space-y-6">
            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <CreateGroupDialog buttonVariant="secondary" />
                    <DashboardAddExpenseButton groups={groups} />
                </CardContent>
            </Card>
            
            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    {groups.length > 0 ? (
                        <div className="space-y-3">
                            {groups.slice(0, 3).map(group => (
                                <Link href={`/groups/${group.id}`} key={group.id} className="block p-3 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors">
                                    <h3 className="font-semibold truncate">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)} total expenses</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">You haven't joined any groups yet.</p>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href="/groups">View All Groups</Link>
                    </Button>
                 </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
