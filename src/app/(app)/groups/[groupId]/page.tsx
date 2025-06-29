
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupDetailHeader } from '@/components/groups/group-detail-header';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { GroupBalances } from '@/components/groups/group-balances';
import { AddSettlementDialog } from '@/components/settlements/add-settlement-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Icons, type IconName } from '@/components/icons';
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
import { GroupSettingsTab } from '@/components/groups/group-settings-tab';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TABS: { value: string; label: string; icon: IconName }[] = [
    { value: 'expenses', label: 'Expenses', icon: 'Expense' },
    { value: 'settlements', label: 'Settlements', icon: 'Settle' },
    { value: 'balances', label: 'Balances', icon: 'Wallet' },
    { value: 'analysis', label: 'Analysis', icon: 'Analysis' },
    { value: 'history', label: 'History', icon: 'History' },
];

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
      const timer = setTimeout(() => {
        const element = document.getElementById(`expense-${targetExpenseId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const highlightClass = 'bg-primary/20';
          
          // Blink effect
          const blink = (count: number) => {
            if (count === 0) return;
            
            element.classList.add(highlightClass);
            setTimeout(() => {
              element.classList.remove(highlightClass);
              if(count > 1) {
                setTimeout(() => blink(count - 1), 300); // Wait before next blink
              }
            }, 300); // Duration of blink
          };
          
          blink(2); // Blink twice
        }
        setTargetExpenseId(null);
      }, 100); // Delay to ensure element is in DOM

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
        onActionComplete={loadGroupData}
        onSettingsClick={() => setActiveTab('settings')}
        activeTab={activeTab}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 md:inline-flex md:w-auto">
          {TABS.map((tab) => {
            const Icon = Icons[tab.icon];
            return (
              <TooltipProvider key={tab.value} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={tab.value}
                      className="w-full gap-2 md:w-auto md:px-4"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">
                    <p>{tab.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </TabsList>
        

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
                <ScrollArea className="h-[45vh]">
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
                </ScrollArea>
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
                <ScrollArea className="h-[45vh]">
                  <div className="divide-y divide-border/50">
                    {settlements.map((settlement) => (
                      <SettlementListItem
                        key={settlement.id}
                        settlement={settlement}
                        currentUserId={userProfile.uid}
                      />
                    ))}
                  </div>
                </ScrollArea>
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

         <TabsContent value="settings" className="mt-4">
            <GroupSettingsTab group={group} onActionComplete={loadGroupData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
