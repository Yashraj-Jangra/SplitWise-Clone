
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { getExpensesByUserId, getSettlementsByUserId, getGroupsByUserId } from '@/lib/mock-data';
import type { Expense, Settlement, Group, UserProfile } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';


interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  actors: UserProfile[]; // Can be multiple for payers
  groupName: string;
  groupId: string;
  date: string;
  icon: React.ReactNode;
}

export function RecentActivityList() {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentActivity() {
      if (!userProfile?.uid) return;

      setLoading(true);
      try {
        const [expenses, settlements, groups] = await Promise.all([
          getExpensesByUserId(userProfile.uid),
          getSettlementsByUserId(userProfile.uid),
          getGroupsByUserId(userProfile.uid),
        ]);
        
        const groupMap = new Map(groups.map(g => [g.id, g.name]));

        const expenseActivities = expenses.map((e: Expense) => {
          const userPaid = e.payers.find(p => p.user.uid === userProfile.uid)?.amount || 0;
          const userOwed = e.participants.find(p => p.user.uid === userProfile.uid)?.amountOwed || 0;
          const netAmount = userPaid - userOwed;

          return {
            id: e.id,
            type: 'expense' as const,
            description: e.description,
            amount: netAmount,
            actors: e.payers.map(p => p.user),
            groupName: groupMap.get(e.groupId) || "a group",
            groupId: e.groupId,
            date: e.date,
            icon: <Icons.Expense className="h-5 w-5 text-primary" />,
          };
        });

        const settlementActivities = settlements.map((s: Settlement) => {
          const isPayer = s.paidBy.uid === userProfile.uid;
          const description = isPayer 
            ? `You paid ${getFullName(s.paidTo.firstName, s.paidTo.lastName)}`
            : `${getFullName(s.paidBy.firstName, s.paidBy.lastName)} paid you`;
          
          return {
            id: s.id,
            type: 'settlement' as const,
            description,
            amount: isPayer ? -s.amount : s.amount,
            actors: [s.paidBy],
            groupName: groupMap.get(s.groupId) || "a group",
            groupId: s.groupId,
            date: s.date,
            icon: <Icons.Settle className="h-5 w-5 text-green-400" />,
          };
        });

        const combined = [...expenseActivities, ...settlementActivities]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 15);

        setActivities(combined);
      } catch (error) {
        console.error("Failed to fetch recent activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentActivity();
  }, [userProfile]);

  const getActorText = (actors: UserProfile[], type: 'expense' | 'settlement') => {
      if (actors.length === 0) return 'Someone';
      if (actors.length === 1) {
          return getFullName(actors[0].firstName, actors[0].lastName);
      }
      return `${getFullName(actors[0].firstName, actors[0].lastName)} & ${actors.length - 1} other${actors.length > 2 ? 's' : ''}`
  }

  if (loading) {
    return (
        <Card className="glass-pane">
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
      <Card className="glass-pane">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Icons.Details className="h-12 w-12 mx-auto mb-2" />
          <p>Your recent activity will show up here.</p>
          <p>Start by adding an expense or settling up in a group!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-pane">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest expenses and settlements across your groups.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          <div className="divide-y divide-border/50">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={activity.actors[0].avatarUrl} />
                    <AvatarFallback>{activity.actors[0].firstName[0]}</AvatarFallback>
                 </Avatar>
                <div className="grid gap-1 flex-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.type === 'expense' ? (
                      <>
                        <span className="font-semibold">{getActorText(activity.actors, activity.type)}</span>
                        {' in '}
                        <Link href={`/groups/${activity.groupId}`} className="hover:underline text-primary/80 hover:text-primary">{activity.groupName}</Link>
                      </>
                    ) : (
                      <>
                        {'in '}
                        <Link href={`/groups/${activity.groupId}`} className="hover:underline text-primary/80 hover:text-primary">{activity.groupName}</Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className={cn(
                        'text-sm font-semibold',
                        activity.amount > 0.01 ? 'text-green-400' :
                        activity.amount < -0.01 ? 'text-red-400' :
                        'text-muted-foreground'
                      )}>
                        {activity.amount > 0.01 ? '+' : ''}
                        {activity.amount < -0.01 ? '−' : ''}
                        {CURRENCY_SYMBOL}{Math.abs(activity.amount).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                    </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
