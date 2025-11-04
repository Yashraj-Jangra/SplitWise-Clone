
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { NetBalanceCard } from '@/components/dashboard/net-balance-card';
import { ObligationsCard } from '@/components/dashboard/obligations-card';
import { DynamicSpendingChart } from '@/components/dashboard/dynamic-spending-chart';
import { PredictiveInsights } from '@/components/dashboard/predictive-insights';

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

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
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
  }, []);

  if (loading || !userProfile) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500">
            {greeting}, {userProfile.firstName}!
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your finances today.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-1"><NetBalanceCard currentUserId={userProfile.uid} /></div>
            <div className="sm:col-span-1"><ObligationsCard currentUserId={userProfile.uid} type="owed" /></div>
            <div className="sm:col-span-2"><ObligationsCard currentUserId={userProfile.uid} type="owes" /></div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><DynamicSpendingChart /></div>
            <div className="lg:col-span-1"><PredictiveInsights /></div>
        </div>
    </div>
  );
}
