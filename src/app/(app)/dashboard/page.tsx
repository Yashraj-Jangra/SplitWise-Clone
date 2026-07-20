'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { NetBalanceCard } from '@/components/dashboard/net-balance-card';
import { ObligationsCard } from '@/components/dashboard/obligations-card';
import { getExpensesByUserId, getSettlementsByUserId, getGroupsByUserId, getGroupBalances, simplifyDebts } from '@/lib/mock-data';
import type { Expense, Settlement, Group, Balance, SimplifiedSettlement, UserProfile } from '@/types';
import { appEventEmitter } from '@/lib/event-emitter';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { PullToRefresh } from '@/components/shared/pull-to-refresh';

// Defer heavy Recharts bundles — only loaded after user data is ready
const DynamicSpendingChart = dynamic(
  () => import('@/components/dashboard/dynamic-spending-chart').then(m => ({ default: m.DynamicSpendingChart })),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> }
);
const PredictiveInsights = dynamic(
  () => import('@/components/dashboard/predictive-insights').then(m => ({ default: m.PredictiveInsights })),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> }
);

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
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <Skeleton className="h-[220px] w-full" />
                <Skeleton className="h-[220px] w-full" />
                <Skeleton className="h-[220px] w-full" />
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

    // 1. Get all balances for each group
    const allGroupBalancesPromises = userGroups.map(group => getGroupBalances(group.id));
    const allGroupBalancesArrays = await Promise.all(allGroupBalancesPromises);

    // 2. Simplify debts for each group to get P2P transactions
    const allSettlements: SimplifiedSettlement[] = allGroupBalancesArrays
        .map(groupBalances => simplifyDebts(groupBalances))
        .flat();

    // 3. Aggregate P2P transactions to find net balance with each person
    const userP2PBalanceMap = new Map<string, { user: UserProfile, netBalance: number }>();

    allSettlements.forEach(settlement => {
        // If I am the one who needs to pay
        if (settlement.from.uid === userId) {
            const otherUser = settlement.to;
            const existing = userP2PBalanceMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
            // I owe them, so my debt to them is a positive value in this context
            existing.netBalance += settlement.amount;
            userP2PBalanceMap.set(otherUser.uid, existing);
        }
        // If I am the one who should receive money
        else if (settlement.to.uid === userId) {
            const otherUser = settlement.from;
            const existing = userP2PBalanceMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
            // They owe me, so my "debt" to them is negative (i.e., they owe me)
            existing.netBalance -= settlement.amount;
            userP2PBalanceMap.set(otherUser.uid, existing);
        }
    });

    return Array.from(userP2PBalanceMap.values());
}


export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  const loadDashboardData = useCallback(async () => {
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
    } finally {
        setDataLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    if (userProfile) {
        loadDashboardData();
    }

    appEventEmitter.on('data-changed', loadDashboardData);
    return () => {
        appEventEmitter.off('data-changed', loadDashboardData);
    };
  }, [userProfile, loadDashboardData]);

  if (authLoading || dataLoading || !userProfile || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { expenses, settlements, balances } = dashboardData;

  return (
    <PullToRefresh onRefresh={loadDashboardData} className="min-h-screen">
      <div className="space-y-6 p-1">
          <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500">
              {greeting}, {userProfile.firstName}!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening with your finances today.</p>
          </div>

          {/* ── Top Row: 3 Equal-Width Financial Position Cards ──────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-full">
                  <ErrorBoundary>
                      <NetBalanceCard expenses={expenses} settlements={settlements} currentUserId={userProfile.uid} />
                  </ErrorBoundary>
              </div>
              <div className="h-full">
                  <ErrorBoundary>
                      <ObligationsCard balances={balances} type="owed" />
                  </ErrorBoundary>
              </div>
              <div className="h-full">
                  <ErrorBoundary>
                      <ObligationsCard balances={balances} type="owes" />
                  </ErrorBoundary>
              </div>
          </div>

          {/* ── Middle Row: Dynamic Spending & Predictive Insights ───────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                  <ErrorBoundary>
                      <DynamicSpendingChart expenses={expenses} />
                  </ErrorBoundary>
              </div>
              <div className="lg:col-span-1">
                  <ErrorBoundary>
                      <PredictiveInsights expenses={expenses} />
                  </ErrorBoundary>
              </div>
          </div>
      </div>
    </PullToRefresh>
  );
}
