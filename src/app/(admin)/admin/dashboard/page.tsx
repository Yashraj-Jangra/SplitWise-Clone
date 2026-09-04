'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, Group, Expense, SupportTicket } from '@/types';
import { getAllUsers, getAllGroups, getAllExpenses, getAllTickets, updateSiteSettings } from '@/lib/api.client';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow, subDays, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { appEventEmitter } from '@/lib/event-emitter';
import {
  UserGrowthChart,
  ExpenseVolumeChart,
  CategoryDonutChart,
  GroupSizeHistogram,
  TopGroupsChart,
} from '@/components/admin/admin-dashboard-charts';

interface AdminData {
  users: UserProfile[];
  groups: Group[];
  expenses: Expense[];
  tickets: SupportTicket[];
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  href,
  valueColor,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  href?: string;
  valueColor?: string;
}) {
  return (
    <Card className="border border-border bg-card rounded-lg shadow-sm transition-colors hover:border-border/80">
      <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="rounded-md bg-muted border border-border p-1.5 text-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-1">
        <p className={cn('text-3xl font-black font-mono tracking-tight text-foreground', valueColor)}>{value}</p>
        {(sub || trendLabel) && (
          <div className="flex items-center gap-1 text-xs font-medium">
            {trend === 'up' && <Icons.TrendingUp className="h-3 w-3 text-emerald-500" />}
            {trend === 'down' && <Icons.TrendingDown className="h-3 w-3 text-rose-500" />}
            {trendLabel && (
              <span className={cn(trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-muted-foreground')}>
                {trendLabel}
              </span>
            )}
            {sub && <span className="text-muted-foreground/80 font-normal">{sub}</span>}
          </div>
        )}
        {href && (
          <div className="pt-1">
            <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs font-bold text-foreground hover:underline">
              <Link href={href}>Inspect →</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [users, groups, expenses, tickets] = await Promise.all([
        getAllUsers(),
        getAllGroups(),
        getAllExpenses(),
        getAllTickets(),
      ]);
      setData({ users, groups, expenses, tickets });

      await updateSiteSettings({
        stats: { users: users.length, groups: groups.length, expenses: expenses.length },
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load dashboard',
        description: 'Could not fetch admin data. You might be missing permissions.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    appEventEmitter.on('data-changed', fetchData);
    return () => { appEventEmitter.off('data-changed', fetchData); };
  }, [fetchData]);

  // ── Derived stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data) return null;
    const { users, groups, expenses, tickets } = data;

    const thirtyDaysAgo = subDays(new Date(), 30);
    const newUsersThisMonth = users.filter(u => u.createdAt && isAfter(new Date(u.createdAt), thirtyDaysAgo)).length;
    const archivedGroups = groups.filter(g => g.archivedAt).length;
    const totalVolume = expenses.reduce((s, e) => s + e.amount, 0);
    const avgExpenseSize = expenses.length > 0 ? totalVolume / expenses.length : 0;
    const avgExpensesPerGroup = groups.length > 0 ? expenses.length / groups.length : 0;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;

    const recentUsers = [...users]
      .filter(u => u.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 5);

    const recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const groupMap = new Map(groups.map(g => [g.id, g.name]));

    return {
      newUsersThisMonth,
      archivedGroups,
      totalVolume,
      avgExpenseSize,
      avgExpensesPerGroup,
      openTickets,
      inProgressTickets,
      recentUsers,
      recentExpenses,
      groupMap,
    };
  }, [data]);

  if (loading) return <DashboardSkeleton />;
  if (!data || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div>
          <Icons.ShieldCheck className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="font-medium">Failed to load dashboard data</p>
          <Button onClick={fetchData} variant="outline" className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const { users, groups, expenses, tickets } = data;
  const totalVolume = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Platform overview as of {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <Icons.History className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ── KPI Strip ───────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={users.length}
          icon={Icons.Users}
          trend="up"
          trendLabel={`+${stats.newUsersThisMonth} this month`}
          href="/admin/users"
        />
        <StatCard
          title="Total Groups"
          value={groups.length}
          icon={Icons.Users}
          sub={`${stats.archivedGroups} archived`}
          href="/admin/groups"
        />
        <StatCard
          title="Total Expenses"
          value={expenses.length}
          icon={Icons.Expense}
          sub={`~${stats.avgExpensesPerGroup.toFixed(1)} per group`}
        />
        <StatCard
          title="Total Volume"
          value={`${CURRENCY_SYMBOL}${totalVolume >= 10000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toFixed(2)}`}
          icon={Icons.Wallet}
          sub={`Avg ${CURRENCY_SYMBOL}${stats.avgExpenseSize.toFixed(2)}`}
          valueColor="text-green-500"
        />
        <StatCard
          title="Support Tickets"
          value={tickets.length}
          icon={Icons.Help}
          trend={stats.openTickets > 0 ? 'down' : 'neutral'}
          trendLabel={`${stats.openTickets} open`}
          sub={`${stats.inProgressTickets} in progress`}
          href="/admin/support"
        />
      </div>

      {/* ── User Growth (full width) ─────────────────── */}
      <Card className="border border-border bg-card rounded-lg shadow-sm">
        <CardHeader className="p-4 border-b border-border/40 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-foreground">Platform Growth</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Monthly user signups and cumulative total over the last 12 months.</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">{users.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pl-0 pr-4 pb-2">
          <UserGrowthChart users={users} />
        </CardContent>
      </Card>

      {/* ── Expense Volume + Category Donut ──────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border bg-card rounded-lg shadow-sm">
          <CardHeader className="p-4 border-b border-border/40 pb-3">
            <CardTitle className="text-base font-extrabold text-foreground">Expense Volume</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Total spending recorded per month for the past 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pl-0 pr-4 pb-2">
            <ExpenseVolumeChart expenses={expenses} />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card rounded-lg shadow-sm">
          <CardHeader className="p-4 border-b border-border/40 pb-3">
            <CardTitle className="text-base font-extrabold text-foreground">Spending by Category</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Breakdown of all platform spending by master category.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pb-2">
            <CategoryDonutChart expenses={expenses} />
          </CardContent>
        </Card>
      </div>

      {/* ── Group Size + Top Groups ───────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Group Size Distribution</CardTitle>
            <CardDescription>How many members each group has across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-4 pb-4">
            <GroupSizeHistogram groups={groups} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Groups by Spend</CardTitle>
            <CardDescription>The 6 most active groups by cumulative expense volume.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <TopGroupsChart groups={groups} />
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Users + Recent Expenses ───────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Sign-ups</CardTitle>
              <CardDescription>Latest 5 registered users.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.recentUsers || []).map(user => (
                  <TableRow key={user.uid} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                          <AvatarFallback className="text-xs">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{getFullName(user.firstName, user.lastName)}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(user.createdAt!), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest 5 expenses across all groups.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{expenses.length} total</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.recentExpenses || []).map(expense => (
                  <TableRow key={expense.id} className="hover:bg-muted/40">
                    <TableCell>
                      <p className="font-medium text-sm truncate max-w-[140px]">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.groupMap.get(expense.groupId) ?? 'Unknown group'} · {format(new Date(expense.date), 'MMM d')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                        {expense.masterCategory || expense.category || 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-green-500 whitespace-nowrap">
                      {CURRENCY_SYMBOL}{expense.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
