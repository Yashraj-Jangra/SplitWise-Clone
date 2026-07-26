'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GroupDetailHeader } from '@/components/groups/group-detail-header';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { GroupBalances } from '@/components/groups/group-balances';
import { AddSettlementDialog } from '@/components/settlements/add-settlement-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { Icons, type IconName } from '@/components/icons';
import {
  getGroupById,
  getExpensesByGroupId,
  getSettlementsByGroupId,
  getGroupBalances,
  getHistoryByGroupId,
} from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import type { Group, Expense, Settlement, Balance, HistoryEvent } from '@/types';
import GroupDetailLoading from '@/app/(app)/groups/[groupId]/loading';
import { GroupAnalysisCharts } from '@/components/groups/group-analysis-charts';
import { GroupHistoryTab } from '@/components/groups/group-history';
import { GroupSettingsTab } from '@/components/groups/group-settings-tab';
import { appEventEmitter } from '@/lib/event-emitter';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/shared/pull-to-refresh';

const TABS: { value: string; label: string; icon: IconName }[] = [
    { value: 'expenses', label: 'Activity', icon: 'History' },
    { value: 'settlements', label: 'Settlements', icon: 'Settle' },
    { value: 'balances', label: 'Balances', icon: 'Wallet' },
    { value: 'analysis', label: 'Analysis', icon: 'Analysis' },
    { value: 'history', label: 'Audit', icon: 'ShieldCheck' },
    { value: 'settings', label: 'Settings', icon: 'Settings' },
];

type ActivityItem = { id: string; type: 'expense' | 'settlement'; date: string; data: Expense | Settlement };

export default function GroupDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const { userProfile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [groupHistory, setGroupHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showAnalysisHeadsUp, setShowAnalysisHeadsUp] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [initialSettlementVal, setInitialSettlementVal] = useState<any>(undefined);

  useEffect(() => {
    if (activeTab === 'analysis' && isMobile) {
      setShowAnalysisHeadsUp(true);
      const timer = setTimeout(() => {
        setShowAnalysisHeadsUp(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isMobile]);

  const loadGroupData = useCallback(async (silent = false) => {
    if (!groupId || !userProfile) return;
    if (!silent) setLoading(true);
    setError(false);
    try {
      const [
        groupData,
        expensesData,
        settlementsData,
        balancesData,
        historyData,
      ] = await Promise.all([
        getGroupById(groupId),
        getExpensesByGroupId(groupId),
        getSettlementsByGroupId(groupId),
        getGroupBalances(groupId),
        getHistoryByGroupId(groupId),
      ]);

      if (!groupData) {
        setError(true);
        return;
      }
      
      if (groupData.archivedAt && userProfile.role !== 'admin') {
        setError(true);
        return;
      }


      setGroup(groupData);
      setExpenses(
        expensesData.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setSettlements(
        settlementsData.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setBalances(balancesData);
      setGroupHistory(historyData);
    } catch (err) {
      console.error('Failed to load group data', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [groupId, userProfile]);

  useEffect(() => {
    loadGroupData();

    const handleDataChanged = () => loadGroupData(true);
    appEventEmitter.on('data-changed', handleDataChanged);

    return () => {
      appEventEmitter.off('data-changed', handleDataChanged);
    };

  }, [loadGroupData]);

  const activityItems: ActivityItem[] = useMemo(() => {
      const combined = [
          ...expenses.map(e => ({ id: `exp-${e.id}`, type: 'expense' as const, date: e.date, data: e })),
          ...settlements.map(s => ({ id: `set-${s.id}`, type: 'settlement' as const, date: s.date, data: s }))
      ];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, settlements]);

  const BATCH_SIZE = 15;
  const [visibleActivityCount, setVisibleActivityCount] = useState(BATCH_SIZE);

  const visibleActivityItems = useMemo(() => {
    return activityItems.slice(0, visibleActivityCount);
  }, [activityItems, visibleActivityCount]);

  // Expand visible bounds if deep-linked item or target expense is beyond initial batch
  useEffect(() => {
    const expId = searchParams?.get('expenseId');
    const setDocId = searchParams?.get('settlementId');
    const currentTargetId = targetItemId || (expId ? `exp-${expId}` : setDocId ? `set-${setDocId}` : null);
    if (currentTargetId) {
      const idx = activityItems.findIndex(i => i.id === currentTargetId);
      if (idx !== -1 && idx >= visibleActivityCount) {
        setVisibleActivityCount(idx + 10);
      }
    }
  }, [searchParams, targetItemId, activityItems, visibleActivityCount]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (visibleActivityCount >= activityItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleActivityCount(prev => Math.min(prev + BATCH_SIZE, activityItems.length));
        }
      },
      { threshold: 0.1 }
    );
    const node = document.getElementById('activity-scroll-sentinel');
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [activityItems.length, visibleActivityCount]);

  // Unified choreographed transition sequence (scroll -> open -> highlight)
  useEffect(() => {
    if (activeTab === 'expenses' && targetItemId) {
      const targetId = targetItemId;

      // 1. Immediately reset scroll to top and ensure accordion item starts closed
      window.scrollTo({ top: 0 });
      setActiveAccordionItem(undefined);

      // 2. Scroll smoothly to the closed item (transition from the top)
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      // 3. Open (expand) the accordion item smoothly after scroll completes
      const expandTimer = setTimeout(() => {
        setActiveAccordionItem(targetId);
      }, 1000);

      // 4. Trigger the double-blink highlight animation once expanded
      const highlightTimer = setTimeout(() => {
        setHighlightedItemId(targetId);
      }, 1300);

      // 5. Clear highlight once double-blink animation finishes
      const clearTimer = setTimeout(() => {
        setHighlightedItemId(null);
      }, 3600);

      setTargetItemId(null);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(expandTimer);
        clearTimeout(highlightTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [activeTab, targetItemId]);

  useEffect(() => {
    if (!searchParams) return;
    const expId = searchParams.get('expenseId');
    const setDocId = searchParams.get('settlementId');
    const action = searchParams.get('action');

    if (action === 'settle') {
      if (setDocId) {
        // Look up the settlement to pre-fill payer/recipient/amount
        const found = settlements.find(s => s.id === setDocId);
        if (found) {
          setInitialSettlementVal({
            paidById: userProfile?.uid || '',
            paidToId: found.paidBy.uid === userProfile?.uid ? found.paidTo.uid : found.paidBy.uid,
            amount: found.amount,
            date: new Date(),
            notes: `Settling reminder for: ${found.notes || 'payment'}`
          });
        } else {
          setInitialSettlementVal({
            paidById: userProfile?.uid || '',
            date: new Date()
          });
        }
      } else {
        setInitialSettlementVal({
          paidById: userProfile?.uid || '',
          date: new Date()
        });
      }
      setSettlementDialogOpen(true);
      
      // Clean up URL query parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (expId) {
      setTargetItemId(`exp-${expId}`);
      setActiveTab('expenses');
      
      // Clean up URL query parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (setDocId) {
      setTargetItemId(`set-${setDocId}`);
      setActiveTab('expenses');
      
      // Clean up URL query parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [searchParams, settlements, userProfile]);

  const handleViewExpense = (expenseId: string) => {
    setTargetItemId(`exp-${expenseId}`);
    setActiveTab('expenses');
  };
  
  const currentUserBalance = useMemo(() => {
    return balances.find(b => b.user.uid === userProfile?.uid)?.netBalance ?? 0;
  }, [balances, userProfile]);
  
  if (error) {
    notFound();
  }

  if (loading || !group || !userProfile) {
    return <GroupDetailLoading />;
  }

  return (
    <PullToRefresh onRefresh={() => loadGroupData(true)} className="min-h-screen">
      <div className="space-y-6 p-1">
        <GroupDetailHeader
          group={group}
          user={userProfile}
          currentUserBalance={currentUserBalance}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 md:w-auto md:inline-flex md:justify-start">
            {TABS.map((tab) => {
              const Icon = Icons[tab.icon];
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 px-2 md:px-4"
                  title={tab.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden md:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="expenses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  A chronological log of all expenses and settlements in this group.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activityItems.length > 0 ? (
                  <>
                    <Accordion type="single" collapsible className="w-full" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
                        {visibleActivityItems.map((item) => {
                            if (item.type === 'expense') {
                                const expense = item.data as Expense;
                                return (
                                   <ExpenseListItem
                                      key={item.id}
                                      expense={expense}
                                      currentUserId={userProfile.uid}
                                      group={group}
                                      groupHistory={groupHistory}
                                      isHighlighted={highlightedItemId === `exp-${expense.id}`}
                                      showGroupName={false}
                                    />
                                )
                            } else {
                                const settlement = item.data as Settlement;
                                return (
                                     <SettlementListItem
                                        key={item.id}
                                        settlement={settlement}
                                        currentUserId={userProfile.uid}
                                        group={group}
                                        groupHistory={groupHistory}
                                        isHighlighted={highlightedItemId === `set-${settlement.id}`}
                                        showGroupName={false}
                                    />
                                )
                            }
                        })}
                     </Accordion>
                     {visibleActivityCount < activityItems.length && (
                       <div id="activity-scroll-sentinel" className="p-3 text-center border-t border-border/30">
                         <Button
                           variant="ghost"
                           size="sm"
                           className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                           onClick={() => setVisibleActivityCount(prev => Math.min(prev + BATCH_SIZE, activityItems.length))}
                         >
                           Showing {visibleActivityItems.length} of {activityItems.length} records — Scroll or tap to load more...
                         </Button>
                       </div>
                     )}
                  </>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Icons.History className="h-12 w-12 mx-auto mb-2" />
                    No activity recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle>Settlements Log</CardTitle>
                  <CardDescription>
                    All settlements made in this group.
                  </CardDescription>
                </div>
                 {!group.archivedAt && <AddSettlementDialog
                   group={group}
                   open={settlementDialogOpen}
                   onOpenChange={setSettlementDialogOpen}
                   initialSettlement={initialSettlementVal}
                 />}
              </CardHeader>
              <CardContent className="p-0">
                {settlements.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {settlements.map((settlement) => (
                      <SettlementListItem
                        key={settlement.id}
                        settlement={settlement}
                        currentUserId={userProfile.uid}
                        group={group}
                        groupHistory={groupHistory}
                        showGroupName={false}
                      />
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Icons.Settle className="h-12 w-12 mx-auto mb-2" />
                    No settlements recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <GroupBalances
              balances={balances}
              group={group}
            />
          </TabsContent>

          <TabsContent value="analysis" className="mt-4">
            {showAnalysisHeadsUp ? (
              <div className="flex items-center justify-center min-h-[400px] p-6 animate-in fade-in-0 duration-500">
                  <Card className="w-full max-w-md text-center">
                      <CardHeader>
                          <div className="flex justify-center mb-4">
                              <Icons.Analysis className="h-16 w-16 text-primary" />
                          </div>
                          <CardTitle className="text-2xl font-headline">Better on Desktop</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-muted-foreground">
                              For the best experience with charts and data, we recommend viewing this page on a larger screen.
                          </p>
                          <p className="text-xs text-muted-foreground mt-4">Loading analytics...</p>
                      </CardContent>
                  </Card>
              </div>
            ) : (
              <GroupAnalysisCharts expenses={expenses} members={group.members} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <GroupHistoryTab
              groupId={group.id}
              onViewExpense={handleViewExpense}
            />
          </TabsContent>

           <TabsContent value="settings" className="mt-4">
              <GroupSettingsTab group={group} />
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
}
