
'use client';

import { useEffect, useState } from 'react';
import { OverviewCard } from "@/components/dashboard/overview-card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { BalanceOverviewSummary } from "@/components/dashboard/balance-overview-summary";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { getGroupsByUserId, getExpensesByUserId } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({ totalGroups: 0, totalSpent: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function getDashboardStats(userId: string) {
      setStatsLoading(true);
      try {
        const [groups, expenses] = await Promise.all([
          getGroupsByUserId(userId),
          getExpensesByUserId(userId),
        ]);
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        setStats({ totalGroups: groups.length, totalSpent });
      } catch (error: any) {
        console.error("Failed to fetch dashboard stats:", error);
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: "Could not load dashboard stats. This may be a permission issue. Please check your Firestore rules.",
        });
      } finally {
        setStatsLoading(false);
      }
    }

    if (userProfile?.uid) {
      getDashboardStats(userProfile.uid);
    }
  }, [userProfile, toast]);

  if (loading || !userProfile) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full lg:col-span-2" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userProfile.name}! Here's your financial overview.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/groups/new">
              <Icons.Add className="mr-2 h-4 w-4" /> New Group
            </Link>
          </Button>
          <Button asChild>
            <Link href="/expenses/new">
             <Icons.Expense className="mr-2 h-4 w-4" /> Add Expense
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
        <>
            <OverviewCard
            title="Total Groups"
            value={stats.totalGroups}
            iconName="Users"
            description="Number of groups you are part of."
            />
            <OverviewCard
            title="Total You've Paid"
            value={stats.totalSpent.toFixed(2)}
            iconName="Currency"
            isCurrency
            description={`Sum of expenses you paid for in ${CURRENCY_SYMBOL}.`}
            />
            <OverviewCard
            title="Owed to You"
            value="--"
            iconName="Wallet"
            isCurrency
            description={`Calculated in Balance Summary`}
            />
            <OverviewCard
            title="You Owe"
            value="--"
            iconName="Landmark"
            isCurrency
            description={`Calculated in Balance Summary`}
            />
        </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivityList />
        <BalanceOverviewSummary currentUserId={userProfile.uid} />
      </div>
      
    </div>
  );
}
