'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { getExpensesByUserId, getGroupsByUserId } from '@/lib/api.client';
import type { Expense, Group } from '@/types';
import { ExpenseListItem } from '@/components/expenses/expense-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { appEventEmitter } from '@/lib/event-emitter';
import { Accordion } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName } from '@/lib/utils';

export default function AllExpensesPage() {
  const { userProfile } = useAuth();
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [groupsMap, setGroupsMap] = useState<Map<string, Group>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filter and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const loadData = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      const [expenses, userGroups] = await Promise.all([
        getExpensesByUserId(userProfile.uid),
        getGroupsByUserId(userProfile.uid)
      ]);
      setGroupsMap(new Map(userGroups.map(g => [g.id, g])));
      setUserExpenses(expenses);
    } catch (e) {
      console.error("Failed to load expenses data:", e);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    loadData();
    appEventEmitter.on('data-changed', loadData);
    return () => {
      appEventEmitter.off('data-changed', loadData);
    };
  }, [loadData]);

  // Compute stats based on loaded userExpenses
  const stats = useMemo(() => {
    let totalMyPaid = 0;
    let totalOwed = 0;
    let totalOwe = 0;

    userExpenses.forEach(exp => {
      const userPayer = exp.payers.find(p => p.user.uid === userProfile?.uid);
      const paidAmount = userPayer ? userPayer.amount : 0;
      totalMyPaid += paidAmount;

      const userPart = exp.participants.find(p => p.user.uid === userProfile?.uid);
      const shareAmount = userPart ? userPart.amountOwed : 0;

      const diff = paidAmount - shareAmount;
      if (diff > 0) {
        totalOwed += diff;
      } else if (diff < 0) {
        totalOwe += Math.abs(diff);
      }
    });

    return { totalMyPaid, totalOwed, totalOwe };
  }, [userExpenses, userProfile?.uid]);

  // Extract unique categories & groups for filters
  const categories = useMemo(() => {
    return Array.from(new Set(userExpenses.map(e => e.category))).filter((cat): cat is string => !!cat);
  }, [userExpenses]);

  const userGroupsList = useMemo(() => {
    return Array.from(groupsMap.values());
  }, [groupsMap]);

  // Apply filtering and sorting, then group by month
  const groupedExpenses = useMemo(() => {
    let result = [...userExpenses];

    // Filter by search query (description, category, notes, members, amount)
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => {
        const descMatch = e.description.toLowerCase().includes(q);
        const catMatch = e.category?.toLowerCase().includes(q);
        const masterCatMatch = e.masterCategory?.toLowerCase().includes(q);
        const notesMatch = e.notes?.toLowerCase().includes(q);
        const amountMatch = e.amount.toString().includes(q);
        const payerMatch = e.payers?.some(p => getFullName(p.user?.firstName, p.user?.lastName).toLowerCase().includes(q));
        const participantMatch = e.participants?.some(p => getFullName(p.user?.firstName, p.user?.lastName).toLowerCase().includes(q));

        return descMatch || catMatch || masterCatMatch || notesMatch || amountMatch || payerMatch || participantMatch;
      });
    }
    // Filter by group
    if (selectedGroupId && selectedGroupId !== 'all') {
      result = result.filter(e => e.groupId === selectedGroupId);
    }
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }
    // Filter by user role
    if (selectedRole && selectedRole !== 'all') {
      if (selectedRole === 'paid_by_me') {
        result = result.filter(e => e.payers.some(p => p.user.uid === userProfile?.uid && p.amount > 0));
      } else if (selectedRole === 'shared_with_me') {
        result = result.filter(e => {
          const userPayer = e.payers.find(p => p.user.uid === userProfile?.uid);
          const userPart = e.participants.find(p => p.user.uid === userProfile?.uid);
          const paid = userPayer ? userPayer.amount : 0;
          const owed = userPart ? userPart.amountOwed : 0;
          return owed > paid;
        });
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      } else if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

    // Group items by month
    const groups: Record<string, { monthYear: string; items: Expense[]; total: number }> = {};
    result.forEach(exp => {
      const dateObj = new Date(exp.date);
      const monthYear = format(dateObj, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = { monthYear, items: [], total: 0 };
      }
      groups[monthYear].items.push(exp);
      groups[monthYear].total += exp.amount;
    });

    return Object.values(groups);
  }, [userExpenses, searchQuery, selectedGroupId, selectedCategory, selectedRole, sortBy, userProfile?.uid]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGroupId('all');
    setSelectedCategory('all');
    setSelectedRole('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters = searchQuery !== '' || selectedGroupId !== 'all' || selectedCategory !== 'all' || selectedRole !== 'all' || sortBy !== 'date_desc';

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-6">
      {/* Header Area */}
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-foreground tracking-tight">My Expenses</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">A consolidated breakdown of all transactions across your groups.</p>
        </div>
        <Button asChild size="sm" className="shadow-md shrink-0 sm:h-10 sm:px-4">
          <Link href="/groups">
            <Icons.Add className="mr-1.5 sm:mr-2 h-4 w-4" /> <span className="text-xs sm:text-sm">Record Expense</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/45 backdrop-blur-md">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/90 uppercase tracking-wider">Total Paid</p>
              <h3 className="text-sm sm:text-lg md:text-2xl font-bold font-sans text-foreground truncate">{CURRENCY_SYMBOL}{stats.totalMyPaid.toFixed(0)}</h3>
            </div>
            <div className="hidden sm:flex h-9 w-9 md:h-12 md:w-12 rounded-xl bg-blue-500/10 items-center justify-center text-blue-500 shadow-inner">
              <Icons.TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/45 backdrop-blur-md">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/90 uppercase tracking-wider">Owed To You</p>
              <h3 className="text-sm sm:text-lg md:text-2xl font-bold font-sans text-green-500 truncate">{CURRENCY_SYMBOL}{stats.totalOwed.toFixed(0)}</h3>
            </div>
            <div className="hidden sm:flex h-9 w-9 md:h-12 md:w-12 rounded-xl bg-green-500/10 items-center justify-center text-green-500 shadow-inner">
              <Icons.Wallet className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/45 backdrop-blur-md">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/90 uppercase tracking-wider">You Owe</p>
              <h3 className="text-sm sm:text-lg md:text-2xl font-bold font-sans text-red-500 truncate">{CURRENCY_SYMBOL}{stats.totalOwe.toFixed(0)}</h3>
            </div>
            <div className="hidden sm:flex h-9 w-9 md:h-12 md:w-12 rounded-xl bg-red-500/10 items-center justify-center text-red-500 shadow-inner">
              <Icons.TrendingDown className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            placeholder="Search description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/20 border-border/30 text-xs sm:text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Filter by Group */}
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/30 text-xs sm:text-sm focus:ring-0 focus:ring-offset-0 focus:border-primary w-full sm:w-[130px] md:w-[150px]">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {userGroupsList.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter by Category */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/30 text-xs sm:text-sm focus:ring-0 focus:ring-offset-0 focus:border-primary w-full sm:w-[130px] md:w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter by User Role */}
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/30 text-xs sm:text-sm focus:ring-0 focus:ring-offset-0 focus:border-primary w-full sm:w-[130px] md:w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="paid_by_me">Paid by me</SelectItem>
            <SelectItem value="shared_with_me">Shared with me</SelectItem>
          </SelectContent>
        </Select>

        {/* Sorting */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/30 text-xs sm:text-sm focus:ring-0 focus:ring-offset-0 focus:border-primary w-full sm:w-[130px] md:w-[150px]">
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Date: Newest</SelectItem>
            <SelectItem value="date_asc">Date: Oldest</SelectItem>
            <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
            <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button onClick={clearFilters} variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Icons.Close className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Main Expense History List */}
      <Card className="border-none shadow-none bg-transparent rounded-none animate-in fade-in duration-500">
        <CardHeader className="py-3 px-0 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold">Expense History</CardTitle>
            {!loading && (
              <CardDescription className="text-[10px] sm:text-xs">
                Showing {groupedExpenses.reduce((sum, g) => sum + g.items.length, 0)} expenses.
              </CardDescription>
            )}
          </div>
          <Icons.History className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/60" />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-4 px-0 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : groupedExpenses.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-17rem)] sm:h-[calc(100vh-19rem)]">
              <div className="space-y-5 py-4 px-0">
                {groupedExpenses.map(group => (
                  <div key={group.monthYear} className="space-y-2.5">
                    {/* Month Section Header */}
                    <div className="flex justify-between items-center border-b border-border/40 pb-1 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icons.Calendar className="h-3.5 w-3.5 text-muted-foreground/75" />
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">{group.monthYear}</h4>
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80 font-sans">
                        Spent: {CURRENCY_SYMBOL}{group.total.toFixed(0)}
                      </span>
                    </div>

                    {/* Month's Items */}
                    <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                      {group.items.map(expense => (
                        <ExpenseListItem
                          key={expense.id}
                          expense={expense}
                          currentUserId={userProfile!.uid}
                          group={groupsMap.get(expense.groupId)}
                          groupHistory={[]}
                        />
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-12 sm:p-16 text-muted-foreground">
              <div className="h-12 w-12 bg-muted border rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Icons.Expense className="h-6 w-6 text-muted-foreground/80" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">No expenses found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-xs mx-auto">
                {hasActiveFilters
                  ? "Try resetting your search query or modifying filters."
                  : "You are not involved in any recorded expenses yet."}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="mt-3.5 shadow-sm text-xs h-8">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
