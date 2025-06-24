
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
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-96 rounded-xl lg:col-span-2" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
}

function QuickActionsWidget() {
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-center items-center p-6 bg-card hover:bg-muted/50 transition-colors">
            <CardTitle className="text-lg font-semibold mb-4">Quick Actions</CardTitle>
            <div className="flex flex-wrap justify-center gap-4">
                <CreateGroupDialog buttonVariant="outline" />
                {/* The AddExpenseDialog needs a group to function, so it can't be a direct quick action without a selection mechanism */}
                <Button variant="outline" disabled>
                    <Icons.Expense className="mr-2 h-4 w-4" /> Add Expense
                </Button>
            </div>
        </Card>
    )
}

function RecentGroupsWidget({ groups }: { groups: Group[] }) {
    if (groups.length === 0) {
        return (
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Recent Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You haven't joined any groups yet.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recent Groups</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.slice(0, 2).map(group => (
                    <Link href={`/groups/${group.id}`} key={group.id}>
                        <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer space-y-3">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            <div className="flex -space-x-2 overflow-hidden">
                                {group.members.slice(0, 5).map(member => (
                                    <Avatar key={member.uid} className="inline-block h-8 w-8 rounded-full border-2 border-background">
                                        <AvatarImage src={member.avatarUrl} alt={getFullName(member.firstName, member.lastName)} />
                                        <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                                    </Avatar>
                                ))}
                                {group.members.length > 5 && <Avatar className="h-8 w-8 rounded-full border-2 border-background bg-muted"><AvatarFallback>+{group.members.length - 5}</AvatarFallback></Avatar>}
                            </div>
                            <p className="text-sm text-muted-foreground">{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)} total expenses</p>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    )
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
        <h1 className="text-4xl font-bold font-headline text-foreground">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Welcome back, {userProfile.firstName}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BalanceOverviewSummary currentUserId={userProfile.uid} />
        <RecentGroupsWidget groups={groups} />
        <QuickActionsWidget />
      </div>

      <div className="grid gap-6">
        <RecentActivityList />
      </div>
      
    </div>
  );
}
