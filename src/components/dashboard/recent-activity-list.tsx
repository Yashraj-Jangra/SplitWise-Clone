"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { getAllExpenses, getAllSettlements, getAllGroups } from '@/lib/mock-data';
import type { Expense, Settlement, Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  user: { name: string };
  groupName: string;
  groupId: string;
  date: string;
  icon: React.ReactNode;
}

export function RecentActivityList() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentActivity() {
      setLoading(true);
      try {
        const [expenses, settlements, groups] = await Promise.all([
          getAllExpenses(),
          getAllSettlements(),
          getAllGroups(),
        ]);
        
        const groupMap = new Map(groups.map(g => [g.id, g.name]));

        const expenseActivities = expenses.map((e: Expense) => ({
          id: e.id,
          type: 'expense' as const,
          description: e.description,
          amount: e.amount,
          user: { name: e.paidBy.name },
          groupName: groupMap.get(e.groupId) || "a group",
          groupId: e.groupId,
          date: e.date,
          icon: <Icons.Expense className="h-5 w-5 text-blue-500" />,
        }));

        const settlementActivities = settlements.map((s: Settlement) => ({
          id: s.id,
          type: 'settlement' as const,
          description: `Settled with ${s.paidTo.name}`,
          amount: s.amount,
          user: { name: s.paidBy.name },
          groupName: groupMap.get(s.groupId) || "a group",
          groupId: s.groupId,
          date: s.date,
          icon: <Icons.Settle className="h-5 w-5 text-green-500" />,
        }));

        const combined = [...expenseActivities, ...settlementActivities]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        setActivities(combined);
      } catch (error) {
        console.error("Failed to fetch recent activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentActivity();
  }, []);

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest expenses and settlements across your groups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }

  if (!activities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>No recent activities to display.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Icons.Details className="h-12 w-12 mx-auto mb-2" />
          <p>Start adding expenses or settling up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest expenses and settlements across your groups.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          <div className="divide-y">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                <div className="p-2 bg-muted rounded-full">
                  {activity.icon}
                </div>
                <div className="grid gap-1 flex-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    By {activity.user.name} in {activity.groupName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </p>
                </div>
                <div className={`text-sm font-semibold ${activity.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {activity.type === 'expense' ? '-' : '+'}{CURRENCY_SYMBOL}{activity.amount.toFixed(2)}
                </div>
                <Button variant="ghost" size="icon" asChild className="ml-auto h-8 w-8">
                  <Link href={`/groups/${activity.groupId}`}>
                    <Icons.ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                    <span className="sr-only">View Details</span>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
       <CardFooter className="pt-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/expenses">View All Activity</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
