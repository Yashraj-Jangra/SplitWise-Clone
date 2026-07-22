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

function calculateUserBalances(userId: string, expenses: Expense[], settlements: Settlement[]): Balance[] {
  const userMap = new Map<string, { user: UserProfile; netBalance: number }>();

  expenses.forEach((expense) => {
    const participantPositions = (expense.participants || []).map((p) => {
      const payer = expense.payers?.find((pay) => pay.user?.uid === p.user?.uid);
      const amountPaid = payer ? payer.amount : 0;
      const amountOwed = p.amountOwed || 0;
      return {
        user: p.user,
        net: amountPaid - amountOwed,
      };
    });

    const myPosition = participantPositions.find((p) => p.user?.uid === userId);
    if (!myPosition || Math.abs(myPosition.net) < 0.001) return;

    const lenders = participantPositions.filter((p) => p.net > 0.001);
    const borrowers = participantPositions.filter((p) => p.net < -0.001);

    const totalLenderSurplus = lenders.reduce((sum, l) => sum + l.net, 0);
    if (totalLenderSurplus < 0.001) return;

    if (myPosition.net > 0) {
      // I am a lender: borrowers owe me in proportion to their debt and my surplus
      borrowers.forEach((b) => {
        if (!b.user?.uid || b.user.uid === userId) return;
        const amountOwedToMe = (myPosition.net * Math.abs(b.net)) / totalLenderSurplus;
        const existing = userMap.get(b.user.uid) || { user: b.user, netBalance: 0 };
        existing.netBalance += amountOwedToMe; // Positive: b owes me
        userMap.set(b.user.uid, existing);
      });
    } else {
      // I am a borrower: I owe lenders in proportion to my debt and their surplus
      lenders.forEach((l) => {
        if (!l.user?.uid || l.user.uid === userId) return;
        const amountIOwe = (Math.abs(myPosition.net) * l.net) / totalLenderSurplus;
        const existing = userMap.get(l.user.uid) || { user: l.user, netBalance: 0 };
        existing.netBalance -= amountIOwe; // Negative: I owe l
        userMap.set(l.user.uid, existing);
      });
    }
  });

  settlements.forEach((settlement) => {
    if (settlement.paidBy?.uid === userId && settlement.paidTo?.uid) {
      const otherUser = settlement.paidTo;
      const existing = userMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
      existing.netBalance += settlement.amount;
      userMap.set(otherUser.uid, existing);
    } else if (settlement.paidTo?.uid === userId && settlement.paidBy?.uid) {
      const otherUser = settlement.paidBy;
      const existing = userMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
      existing.netBalance -= settlement.amount;
      userMap.set(otherUser.uid, existing);
    }
  });

  return Array.from(userMap.values())
    .map((b) => ({ user: b.user, netBalance: parseFloat(b.netBalance.toFixed(2)) }))
    .filter((b) => Math.abs(b.netBalance) >= 0.01);
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
        const [expenses, settlements] = await Promise.all([
            getExpensesByUserId(userProfile.uid),
            getSettlementsByUserId(userProfile.uid),
        ]);
        const balances = calculateUserBalances(userProfile.uid, expenses, settlements);
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
