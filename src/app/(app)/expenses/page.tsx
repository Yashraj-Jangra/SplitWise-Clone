
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { mockExpenses } from '@/lib/mock-data';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'All Expenses - SettleEase',
  description: 'View all your expenses across all groups.',
};

export default async function AllExpensesPage() {
  const currentUser = await getCurrentUser();
  // Fetch all expenses related to the current user (paid by or participated in)
  // For mock, we filter all expenses where current user is involved.
  const userExpenses = mockExpenses.filter(
    expense => expense.paidBy.id === currentUser.id || 
               expense.participants.some(p => p.user.id === currentUser.id)
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">My Expenses</h1>
          <p className="text-muted-foreground">A consolidated view of all your expenses.</p>
        </div>
        <Button asChild>
            <Link href="/expenses/new"> {/* This would likely open a dialog to select group first */}
             <Icons.Expense className="mr-2 h-4 w-4" /> Add New Expense
            </Link>
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>Showing {userExpenses.length} expenses you are involved in.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {userExpenses.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height */}
              <div className="divide-y">
                {userExpenses.map((expense) => (
                  <ExpenseListItem key={expense.id} expense={expense} currentUserId={currentUser.id} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              <Icons.Expense className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg">No expenses found.</p>
              <p>Get started by adding an expense in one of your groups.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
