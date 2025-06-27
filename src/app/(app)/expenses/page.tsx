'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { getExpensesByUserId } from '@/lib/mock-data';
import type { Expense } from '@/types';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

// export const metadata: Metadata = {
//   title: 'All Expenses - SettleEase',
//   description: 'View all your expenses across all groups.',
// };

export default function AllExpensesPage() {
  const { userProfile } = useAuth();
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    const expenses = await getExpensesByUserId(userProfile.uid);
    setUserExpenses(expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  }, [userProfile?.uid]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">My Expenses</h1>
          <p className="text-muted-foreground">A consolidated view of all your expenses.</p>
        </div>
        <Button asChild>
            <Link href="/groups">
             <Icons.Expense className="mr-2 h-4 w-4" /> Add New Expense
            </Link>
          </Button>
      </div>
      
      <div className="rounded-md border border-border/50 bg-card/50">
        <CardHeader>
            <CardTitle>Expense History</CardTitle>
            {!loading && <CardDescription>Showing {userExpenses.length} expenses you are involved in.</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">
            {loading ? (
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            ) : userExpenses.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-22rem)]">
                <div className="divide-y divide-border/50">
                    {userExpenses.map((expense) => (
                    <ExpenseListItem key={expense.id} expense={expense} currentUserId={userProfile!.uid} onActionComplete={loadExpenses} />
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
      </div>
    </div>
  );
}
