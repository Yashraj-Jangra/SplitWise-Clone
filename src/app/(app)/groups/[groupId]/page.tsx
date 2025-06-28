
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupDetailHeader } from '@/components/groups/group-detail-header';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { GroupMembers } from '@/components/groups/group-members';
import { GroupBalances } from '@/components/groups/group-balances';
import { AddSettlementDialog } from '@/components/settlements/add-settlement-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import {
  getGroupById,
  getExpensesByGroupId,
  getSettlementsByGroupId,
  getGroupBalances,
} from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import type { Group, Expense, Settlement, Balance } from '@/types';
import GroupDetailLoading from './loading'; // Import loading component
import { GroupAnalysisCharts } from '@/components/groups/group-analysis-charts';
import { GroupHistoryTab } from '@/components/groups/group-history';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { userProfile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');
  const [targetExpenseId, setTargetExpenseId] = useState<string | null>(null);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [groupData, expensesData, settlementsData, balancesData] =
        await Promise.all([
          getGroupById(groupId),
          getExpensesByGroupId(groupId),
          getSettlementsByGroupId(groupId),
          getGroupBalances(groupId),
        ]);

      if (!groupData) {
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
    } catch (error) {
      console.error('Failed to load group data', error);
      // Handle error state
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  useEffect(() => {
    // Handles scrolling to and highlighting an expense when navigated from history
    if (activeTab === 'expenses' && targetExpenseId) {
      const element = document.getElementById(`expense-${targetExpenseId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add(
          'bg-primary/20',
          'transition-all',
          'duration-1000',
          'rounded-lg'
        );
        setTimeout(() => {
          element.classList.remove('bg-primary/20', 'rounded-lg');
        }, 2000);
      }
      setTargetExpenseId(null);
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
        onActionComplete={loadGroupData}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="settlements">Settlements</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Log</CardTitle>
              <CardDescription>
                All expenses recorded in this group.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {expenses.map((expense) => (
                    <ExpenseListItem
                      key={expense.id}
                      expense={expense}
                      currentUserId={userProfile.uid}
                      group={group}
                      onActionComplete={loadGroupData}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Icons.Details className="h-12 w-12 mx-auto mb-2" />
                  No expenses recorded yet.
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
              <AddSettlementDialog
                group={group}
                onSettlementAdded={loadGroupData}
              />
            </CardHeader>
            <CardContent className="p-0">
              {settlements.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {settlements.map((settlement) => (
                    <SettlementListItem
                      key={settlement.id}
                      settlement={settlement}
                      currentUserId={userProfile.uid}
                    />
                  ))}
                </div>
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
            onSettlementAdded={loadGroupData}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <GroupMembers
            members={group.members}
            group={group}
            onActionComplete={loadGroupData}
          />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <GroupAnalysisCharts expenses={expenses} members={group.members} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <GroupHistoryTab
            groupId={group.id}
            onActionComplete={loadGroupData}
            onViewExpense={handleViewExpense}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
