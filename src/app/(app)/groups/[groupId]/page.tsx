
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
import { getCurrentUser } from '@/lib/auth';

interface GroupPageParams {
  params: { groupId: string };
}

export async function generateMetadata({ params }: GroupPageParams): Promise<Metadata> {
  const group = await getGroupById(params.groupId);
  if (!group) {
    return { title: 'Group Not Found - SettleEase' };
  }
  return {
    title: `${group.name} - SettleEase`,
    description: `Details for group: ${group.name}. ${group.description || ''}`,
  };
}

export default async function GroupDetailPage({ params }: GroupPageParams) {
  const group = await getGroupById(params.groupId);
  if (!group) {
    notFound();
  }

  const expenses = await getExpensesByGroupId(params.groupId);
  const settlements = await getSettlementsByGroupId(params.groupId);
  const balances = await getGroupBalances(params.groupId);
  const currentUser = await getCurrentUser();

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
              <AddExpenseDialog group={group} />
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {expenses.map((expense) => (
                      <ExpenseListItem key={expense.id} expense={expense} currentUserId={currentUser.id} group={group}/>
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
              <AddSettlementDialog group={group} />
            </CardHeader>
            <CardContent className="p-0">
              {settlements.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {settlements.map((settlement) => (
                      <SettlementListItem key={settlement.id} settlement={settlement} currentUserId={currentUser.id} />
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
          <GroupBalances balances={balances} group={group} />
        </TabsContent>

        <TabsContent value="members">
          <GroupMembers members={group.members} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
