
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { BalanceOverviewSummary } from "@/components/dashboard/balance-overview-summary";
import { Icons } from "@/components/icons";
import { getGroupsByUserId } from "@/lib/mock-data";
import { useAuth } from '@/contexts/auth-context';
import type { Group } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { DashboardAddExpenseButton } from '@/components/expenses/dashboard-add-expense-button';
import { SpendingBreakdown } from '@/components/dashboard/spending-breakdown';


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
                <div className="lg:col-span-3">
                     <Skeleton className="h-36 rounded-xl" />
                </div>
                <div className="lg:col-span-2">
                     <Skeleton className="h-96 rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-24 rounded-xl" />
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
        
        {/* Net Balance */}
        <div className="lg:col-span-3">
            <BalanceOverviewSummary currentUserId={userProfile.uid} />
        </div>

        {/* Spending Breakdown Chart */}
        <div className="lg:col-span-2">
            <SpendingBreakdown />
        </div>

        {/* Side column for Quick Actions & Activity */}
        <div className="space-y-8">
            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                    <CreateGroupDialog buttonVariant="secondary" />
                    <DashboardAddExpenseButton groups={groups} />
                </CardContent>
            </Card>
            <RecentActivityList />
        </div>
      </div>
    </div>
  );
}
