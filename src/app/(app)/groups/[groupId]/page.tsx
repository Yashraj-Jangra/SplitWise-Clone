
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupDetailHeader } from "@/components/groups/group-detail-header";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { SettlementListItem } from "@/components/settlements/settlement-list-item";
import { GroupMembers } from "@/components/groups/group-members";
import { GroupBalances } from "@/components/groups/group-balances";
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { AddSettlementDialog } from '@/components/settlements/add-settlement-dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { getGroupById, getExpensesByGroupId, getSettlementsByGroupId, getGroupBalances } from "@/lib/mock-data";
import { useAuth } from '@/contexts/auth-context';
import type { Group, Expense, Settlement, Balance } from '@/types';
import GroupDetailLoading from './loading'; // Import loading component

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { userProfile } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
        const [groupData, expensesData, settlementsData, balancesData] = await Promise.all([
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
        setExpenses(expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setSettlements(settlementsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setBalances(balancesData);

    } catch (error) {
        console.error("Failed to load group data", error);
        // Handle error state
    } finally {
        setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  if (loading || !group || !userProfile) {
    return <GroupDetailLoading />;
  }

  return (
    <div className="space-y-6">
      <GroupDetailHeader group={group} />

      <Tabs defaultValue="expenses" className="w-full">
        <div className="flex justify-between items-center mb-4">
            <TabsList>
                <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
                <TabsTrigger value="settlements">Settlements ({settlements.length})</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="members">Members ({group.members.length})</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                    <Icons.Expense className="h-5 w-5 mr-2 text-primary" />
                    Expenses
                </CardTitle>
                <CardDescription>All expenses recorded in this group.</CardDescription>
              </div>
              <AddExpenseDialog group={group} onExpenseAdded={loadGroupData} />
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {expenses.map((expense) => (
                      <ExpenseListItem key={expense.id} expense={expense} currentUserId={userProfile.uid} group={group}/>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Icons.Details className="h-12 w-12 mx-auto mb-2"/>
                  No expenses recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                    <Icons.Settle className="h-5 w-5 mr-2 text-primary" />
                    Settlements
                </CardTitle>
                <CardDescription>All settlements made in this group.</CardDescription>
              </div>
              <AddSettlementDialog group={group} onSettlementAdded={loadGroupData} />
            </CardHeader>
            <CardContent className="p-0">
              {settlements.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {settlements.map((settlement) => (
                      <SettlementListItem key={settlement.id} settlement={settlement} currentUserId={userProfile.uid} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Icons.Details className="h-12 w-12 mx-auto mb-2"/>
                  No settlements recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <GroupBalances balances={balances} group={group} onSettlementAdded={loadGroupData} />
        </TabsContent>

        <TabsContent value="members">
          <GroupMembers members={group.members} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
