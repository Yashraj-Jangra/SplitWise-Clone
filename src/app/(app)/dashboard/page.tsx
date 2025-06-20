import type { Metadata } from 'next';
import { OverviewCard } from "@/components/dashboard/overview-card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { BalanceOverviewSummary } from "@/components/dashboard/balance-overview-summary";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { mockCurrentUser, mockGroups, mockExpenses } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Dashboard - SettleEase',
  description: 'Overview of your expenses, groups, and balances.',
};

// Dummy data fetching functions for dashboard stats
async function getDashboardStats(userId: string) {
  // In a real app, fetch this data from your backend
  const totalGroups = mockGroups.filter(g => g.members.some(m => m.id === userId)).length;
  
  const userExpenses = mockExpenses.filter(e => e.paidBy.id === userId || e.participants.some(p => p.user.id === userId));
  const totalSpentByCurrentUser = userExpenses
    .filter(e => e.paidBy.id === userId)
    .reduce((sum, e) => sum + e.amount, 0);

  // This is a very simplified "You Owe" / "Owed to You". Real calculation is complex.
  // Using simplified values for display
  let totalOwedToUser = 0;
  let totalUserOwes = 0;
   if (userId === "user1") { // Alice
      totalOwedToUser = 750; 
      totalUserOwes = 300;
  }

  return {
    totalGroups,
    totalSpent: totalSpentByCurrentUser, // Total amount the current user has personally paid for expenses
    netOwedToUser: totalOwedToUser, // What others owe the current user
    netUserOwes: totalUserOwes,     // What the current user owes others
  };
}


export default async function DashboardPage() {
  const currentUser = mockCurrentUser;
  const stats = await getDashboardStats(currentUser.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser.name}! Here's your financial overview.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/groups/new">
              <Icons.Add className="mr-2 h-4 w-4" /> New Group
            </Link>
          </Button>
          <Button asChild>
            <Link href="/expenses/new">
             <Icons.Expense className="mr-2 h-4 w-4" /> Add Expense
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Total Groups"
          value={stats.totalGroups}
          iconName="Users"
          description="Number of groups you are part of."
        />
        <OverviewCard
          title="Total You've Paid"
          value={stats.totalSpent.toFixed(2)}
          iconName="Currency"
          isCurrency
          description={`Sum of expenses you paid for in ${CURRENCY_SYMBOL}.`}
        />
        <OverviewCard
          title="Owed to You"
          value={stats.netOwedToUser.toFixed(2)}
          iconName="Wallet"
          isCurrency
          description={`Across all groups in ${CURRENCY_SYMBOL}.`}
          trend="up"
          trendValue="From 3 people"
        />
        <OverviewCard
          title="You Owe"
          value={stats.netUserOwes.toFixed(2)}
          iconName="Landmark"
          isCurrency
          description={`Across all groups in ${CURRENCY_SYMBOL}.`}
          trend="down"
          trendValue="To 1 person"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivityList />
        <BalanceOverviewSummary />
      </div>
      
    </div>
  );
}

// These are placeholder routes. In a real app, these would lead to forms/modals.
// Example for /groups/new (src/app/(app)/groups/new/page.tsx)
// export default function NewGroupPage() { /* return <CreateGroupForm /> or trigger dialog */ }
// Example for /expenses/new (src/app/(app)/expenses/new/page.tsx)
// export default function NewExpensePage() { /* return <AddExpenseForm /> or trigger dialog */ }