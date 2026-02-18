'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const groupId = params.groupId as string;
  const { userProfile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [groupHistory, setGroupHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');
  const [targetExpenseId, setTargetExpenseId] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

  const loadGroupData = useCallback(async () => {
    if (!groupId || !userProfile) return;
    setLoading(true);
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
        notFound();
        return;
      }
      
      if (groupData.archivedAt && userProfile.role !== 'admin') {
        notFound();
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
    } catch (error) {
      console.error('Failed to load group data', error);
      // Handle error state
    } finally {
      setLoading(false);
    }
  }, [groupId, userProfile]);

  useEffect(() => {
    loadGroupData();
    
    appEventEmitter.on('data-changed', loadGroupData);

    return () => {
      appEventEmitter.off('data-changed', loadGroupData);
    };

  }, [loadGroupData]);

  const activityItems: ActivityItem[] = useMemo(() => {
      const combined = [
          ...expenses.map(e => ({ id: `exp-${e.id}`, type: 'expense' as const, date: e.date, data: e })),
          ...settlements.map(s => ({ id: `set-${s.id}`, type: 'settlement' as const, date: s.date, data: s }))
      ];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, settlements]);


  useEffect(() => {
    if (activeTab === 'expenses' && targetExpenseId) {
      setActiveAccordionItem(`exp-${targetExpenseId}`);
      const timer = setTimeout(() => {
        const element = document.getElementById(`exp-${targetExpenseId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTargetExpenseId(null);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeTab, targetExpenseId]);

  const handleViewExpense = (expenseId: string) => {
    setTargetExpenseId(expenseId);
    setActiveTab('expenses');
  };
  
  const currentUserBalance = useMemo(() => {
    return balances.find(b => b.user.uid === userProfile?.uid)?.netBalance ?? 0;
  }, [balances, userProfile]);

  if (loading || !group || !userProfile) {
    return <GroupDetailLoading />;
  }

  return (
    <div className="space-y-6">
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
                <Accordion type="single" collapsible className="w-full" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
                    {activityItems.map((item) => {
                        if (item.type === 'expense') {
                            const expense = item.data as Expense;
                            return (
                               <ExpenseListItem
                                  key={item.id}
                                  expense={expense}
                                  currentUserId={userProfile.uid}
                                  group={group}
                                  groupHistory={groupHistory}
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
                                />
                            )
                        }
                    })}
                 </Accordion>
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
          <GroupAnalysisCharts expenses={expenses} members={group.members} />
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
  );
}
