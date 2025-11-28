
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { NetBalanceCard } from '@/components/dashboard/net-balance-card';
import { ObligationsCard } from '@/components/dashboard/obligations-card';
import { DynamicSpendingChart } from '@/components/dashboard/dynamic-spending-chart';
import { PredictiveInsights } from '@/components/dashboard/predictive-insights';
import { getExpensesByUserId, getSettlementsByUserId, getGroupsByUserId, getGroupBalances } from '@/lib/mock-data';
import type { Expense, Settlement, Group, Balance } from '@/types';

interface DashboardData {
  expenses: Expense[];
  settlements: Settlement[];
  balances: Balance[];
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[180px] w-full" />
                <Skeleton className="h-[180px] w-full" />
                <Skeleton className="h-[180px] w-full lg:col-span-2" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-80 w-full lg:col-span-2" />
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    );
}

async function getOverallBalances(userId: string): Promise<Balance[]> {
    const userGroups = await getGroupsByUserId(userId);
    if (userGroups.length === 0) return [];
    
    const allGroupBalancesPromises = userGroups.map(group => getGroupBalances(group.id));
    const allGroupBalances = await Promise.all(allGroupBalancesPromises);

    const userBalanceMap = new Map<string, { user: any, netBalance: number }>();

    allGroupBalances.flat().forEach(balance => {
        if (balance.user.uid === userId) return;
        const existing = userBalanceMap.get(balance.user.uid) || { user: balance.user, netBalance: 0 };
        existing.netBalance += balance.netBalance;
        userBalanceMap.set(balance.user.uid, existing);
    });

    return Array.from(userBalanceMap.values());
}

export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    async function loadDashboardData() {
        if (!userProfile?.uid) return;
        
        setDataLoading(true);
        try {
            const [expenses, settlements, balances] = await Promise.all([
                getExpensesByUserId(userProfile.uid),
                getSettlementsByUserId(userProfile.uid),
                getOverallBalances(userProfile.uid)
            ]);
            setDashboardData({ expenses, settlements, balances });
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            // Optionally, set an error state here
        } finally {
            setDataLoading(false);
        }
    }
    
    if (userProfile) {
        loadDashboardData();
    }
  }, [userProfile]);

  if (authLoading || dataLoading || !userProfile || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { expenses, settlements, balances } = dashboardData;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500">
            {greeting}, {userProfile.firstName}!
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your finances today.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-1"><NetBalanceCard expenses={expenses} settlements={settlements} currentUserId={userProfile.uid} /></div>
            <div className="sm:col-span-1"><ObligationsCard balances={balances} type="owed" /></div>
            <div className="sm:col-span-2"><ObligationsCard balances={balances} type="owes" /></div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><DynamicSpendingChart expenses={expenses} /></div>
            <div className="lg:col-span-1"><PredictiveInsights expenses={expenses} /></div>
        </div>
    </div>
  );
}
