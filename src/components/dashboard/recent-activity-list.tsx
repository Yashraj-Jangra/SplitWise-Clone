"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/icons";
import { mockExpenses, mockSettlements, mockUsers } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  user: { name: string; avatarUrl?: string; initials: string };
  groupName: string;
  groupId: string;
  date: string;
  icon: React.ReactNode;
}

// Combine and sort mock data for recent activity
const combinedActivities = [
  ...mockExpenses.map(e => ({
    id: e.id,
    type: "expense" as const,
    description: e.description,
    amount: e.amount,
    user: { name: e.paidBy.name, avatarUrl: e.paidBy.avatarUrl, initials: e.paidBy.name.substring(0,2).toUpperCase() },
    groupName: mockUsers.find(u => u.id === e.paidBy.id) ? `in group ${e.groupId}` : "Unknown Group", // Simplified
    groupId: e.groupId,
    date: e.date,
    icon: <Icons.Expense className="h-5 w-5 text-blue-500" />
  })),
  ...mockSettlements.map(s => ({
    id: s.id,
    type: "settlement" as const,
    description: `Settled with ${s.paidTo.name}`,
    amount: s.amount,
    user: { name: s.paidBy.name, avatarUrl: s.paidBy.avatarUrl, initials: s.paidBy.name.substring(0,2).toUpperCase() },
    groupName: `in group ${s.groupId}`, // Simplified
    groupId: s.groupId,
    date: s.date,
    icon: <Icons.Settle className="h-5 w-5 text-green-500" />
  })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 .slice(0, 10); // Show top 10 recent activities


export function RecentActivityList() {
  const activities: ActivityItem[] = combinedActivities; // Use the combined and sorted data

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
                    By {activity.user.name} {activity.groupName}
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
          <Link href="/activity">View All Activity</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Placeholder page for all activity, not fully implemented.
export function AllActivityPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Activity</h1>
      <p>This page would show a complete list of all activities.</p>
    </div>
  );
}

// You would create a src/app/(app)/activity/page.tsx for this.
// For now, this is just a placeholder to make the link work.
// Example: src/app/(app)/activity/page.tsx
// export default function ActivityPage() { return <AllActivityPage