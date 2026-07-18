'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { getSettlementsByUserId, getGroupsByUserId } from '@/lib/firestore.service';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settlement, Group } from '@/types';
import { Accordion } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName } from '@/lib/utils';

export default function AllSettlementsPage() {
  const { userProfile } = useAuth();
  const [userSettlements, setUserSettlements] = useState<Settlement[]>([]);
  const [groupsMap, setGroupsMap] = useState<Map<string, Group>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filter and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const loadData = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      const [settlements, userGroups] = await Promise.all([
        getSettlementsByUserId(userProfile.uid),
        getGroupsByUserId(userProfile.uid)
      ]);
      setGroupsMap(new Map(userGroups.map(g => [g.id, g])));
      setUserSettlements(settlements);
    } catch (e) {
      console.error("Failed to load settlements data:", e);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute stats based on loaded userSettlements
  const stats = useMemo(() => {
    let totalSent = 0;
    let totalReceived = 0;

    userSettlements.forEach(sett => {
      const isPaidByMe = sett.paidBy.uid === userProfile?.uid;
      const isPaidToMe = sett.paidTo.uid === userProfile?.uid;
      if (isPaidByMe) {
        totalSent += sett.amount;
      }
      if (isPaidToMe) {
        totalReceived += sett.amount;
      }
    });

    return { totalSent, totalReceived };
  }, [userSettlements, userProfile?.uid]);

  const userGroupsList = useMemo(() => {
    return Array.from(groupsMap.values());
  }, [groupsMap]);

  // Apply filtering and sorting, then group by month
  const groupedSettlements = useMemo(() => {
    let result = [...userSettlements];

    // Filter by search name (description / payer / payee)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => {
        const payerName = getFullName(s.paidBy.firstName, s.paidBy.lastName).toLowerCase();
        const payeeName = getFullName(s.paidTo.firstName, s.paidTo.lastName).toLowerCase();
        return payerName.includes(q) || payeeName.includes(q);
      });
    }
    // Filter by group
    if (selectedGroupId && selectedGroupId !== 'all') {
      result = result.filter(s => s.groupId === selectedGroupId);
    }
    // Filter by user role
    if (selectedRole && selectedRole !== 'all') {
      if (selectedRole === 'paid_by_me') {
        result = result.filter(s => s.paidBy.uid === userProfile?.uid);
      } else if (selectedRole === 'paid_to_me') {
        result = result.filter(s => s.paidTo.uid === userProfile?.uid);
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
    const groups: Record<string, { monthYear: string; items: Settlement[]; total: number }> = {};
    result.forEach(sett => {
      const dateObj = new Date(sett.date);
      const monthYear = format(dateObj, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = { monthYear, items: [], total: 0 };
      }
      groups[monthYear].items.push(sett);
      groups[monthYear].total += sett.amount;
    });

    return Object.values(groups);
  }, [userSettlements, searchQuery, selectedGroupId, selectedRole, sortBy, userProfile?.uid]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGroupId('all');
    setSelectedRole('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters = searchQuery !== '' || selectedGroupId !== 'all' || selectedRole !== 'all' || sortBy !== 'date_desc';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500">My Settlements</h1>
          <p className="text-muted-foreground text-sm mt-1">A consolidated breakdown of all recorded payments and settlements.</p>
        </div>
        <Button asChild className="shadow-md shrink-0">
          <Link href="/groups">
            <Icons.Settle className="mr-2 h-4 w-4" /> Record Settlement
          </Link>
        </Button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total You Paid Out</p>
              <h3 className="text-2xl font-bold font-sans text-foreground">{CURRENCY_SYMBOL}{stats.totalSent.toFixed(2)}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
              <Icons.TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total You Received</p>
              <h3 className="text-2xl font-bold font-sans text-green-500">{CURRENCY_SYMBOL}{stats.totalReceived.toFixed(2)}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
              <Icons.Check className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 shadow-sm bg-card/30">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search member name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>

            {/* Filter by Group */}
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {userGroupsList.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by Payer/Payee Role */}
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="paid_by_me">Payments you sent</SelectItem>
                <SelectItem value="paid_to_me">Payments you received</SelectItem>
              </SelectContent>
            </Select>

            {/* Sorting */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date: Newest</SelectItem>
                <SelectItem value="date_asc">Date: Oldest</SelectItem>
                <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
                <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button onClick={clearFilters} variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                <Icons.Close className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Settlements History List */}
      <Card className="border-border/60 shadow-sm overflow-hidden bg-card/20 rounded-2xl">
        <CardHeader className="border-b border-border/50 bg-muted/20 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Settlement History</CardTitle>
            {!loading && (
              <CardDescription className="text-xs">
                Showing {groupedSettlements.reduce((sum, g) => sum + g.items.length, 0)} settlements.
              </CardDescription>
            )}
          </div>
          <Icons.History className="h-5 w-5 text-muted-foreground/60" />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : groupedSettlements.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-25rem)]">
              <div className="space-y-6 p-6">
                {groupedSettlements.map(group => (
                  <div key={group.monthYear} className="space-y-3">
                    {/* Month Section Header */}
                    <div className="flex justify-between items-center border-b border-border/40 pb-1 px-1">
                      <h4 className="text-sm font-semibold text-muted-foreground">{group.monthYear}</h4>
                      <span className="text-xs font-semibold text-muted-foreground/80 font-sans">
                        Month Total: {CURRENCY_SYMBOL}{group.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Month's Items */}
                    <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                      {group.items.map(settlement => (
                        <SettlementListItem
                          key={settlement.id}
                          settlement={settlement}
                          currentUserId={userProfile!.uid}
                          group={groupsMap.get(settlement.groupId)}
                          groupHistory={[]}
                        />
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-16 text-muted-foreground">
              <div className="h-14 w-14 bg-muted border rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Icons.Settle className="h-7 w-7 text-muted-foreground/80" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">No settlements found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {hasActiveFilters
                  ? "Try resetting your search query or modifying filters."
                  : "You do not have any payment settlements recorded yet."}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="mt-4 shadow-sm">
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
