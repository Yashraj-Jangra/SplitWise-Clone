
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import type { Group, Expense, UserProfile, Settlement } from '@/types';
import { getGroupsByUserId, getExpensesByUserId, getSettlementsByUserId, hydrateUsers } from '@/lib/api.client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ChevronRight, Folder } from 'lucide-react';

type SearchResult =
  | { type: 'group'; data: Group }
  | { type: 'expense'; data: Expense }
  | { type: 'settlement'; data: Settlement }
  | { type: 'user'; data: UserProfile };

interface RecentSearch {
  id: string;
  type: 'group' | 'expense' | 'settlement' | 'user';
  title: string;
  subtitle?: string;
  url: string;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<{
    groups: Group[];
    expenses: Expense[];
    settlements: Settlement[];
    users: UserProfile[];
  } | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent searches', e);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);

    const [userGroups, userExpenses, userSettlements] = await Promise.all([
      getGroupsByUserId(userProfile.uid),
      getExpensesByUserId(userProfile.uid),
      getSettlementsByUserId(userProfile.uid),
    ]);

    const mutualMemberIds = new Set<string>();
    userGroups.forEach(group => {
      group.members?.forEach(m => mutualMemberIds.add(m.uid));
    });
    
    // Remove current user from the list of users to display
    mutualMemberIds.delete(userProfile.uid);

    const mutualUsers = await hydrateUsers(Array.from(mutualMemberIds));

    setAllData({
      groups: userGroups,
      expenses: userExpenses,
      settlements: userSettlements,
      users: mutualUsers,
    });
    setLoading(false);
  }, [userProfile?.uid]);

  useEffect(() => {
    if (open && !allData) {
      loadAllData();
    }
    if (!open) {
      setQuery('');
    }
  }, [open, allData, loadAllData]);

  const searchResults = useMemo(() => {
    if (!query || !allData) return [];

    const lowerCaseQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search groups
    allData.groups.forEach(group => {
      if (
        group.name.toLowerCase().includes(lowerCaseQuery) ||
        (group.description && group.description.toLowerCase().includes(lowerCaseQuery))
      ) {
        results.push({ type: 'group', data: group });
      }
    });

    // Search expenses
    allData.expenses.forEach(expense => {
      const payerMatch = expense.payers?.some(p =>
        getFullName(p.user?.firstName, p.user?.lastName).toLowerCase().includes(lowerCaseQuery)
      );
      const participantMatch = expense.participants?.some(p =>
        getFullName(p.user?.firstName, p.user?.lastName).toLowerCase().includes(lowerCaseQuery)
      );

      if (
        expense.description.toLowerCase().includes(lowerCaseQuery) ||
        (expense.category && expense.category.toLowerCase().includes(lowerCaseQuery)) ||
        (expense.masterCategory && expense.masterCategory.toLowerCase().includes(lowerCaseQuery)) ||
        (expense.notes && expense.notes.toLowerCase().includes(lowerCaseQuery)) ||
        expense.amount.toString().includes(lowerCaseQuery) ||
        payerMatch ||
        participantMatch
      ) {
        results.push({ type: 'expense', data: expense });
      }
    });

    // Search settlements
    allData.settlements.forEach(settlement => {
      const payerName = getFullName(settlement.paidBy?.firstName, settlement.paidBy?.lastName).toLowerCase();
      const payeeName = getFullName(settlement.paidTo?.firstName, settlement.paidTo?.lastName).toLowerCase();
      const groupName = (allData.groups.find(g => g.id === settlement.groupId)?.name || '').toLowerCase();
      const notesMatch = settlement.notes?.toLowerCase().includes(lowerCaseQuery) || false;
      const amountMatch = settlement.amount.toString().includes(lowerCaseQuery);

      if (
        payerName.includes(lowerCaseQuery) ||
        payeeName.includes(lowerCaseQuery) ||
        groupName.includes(lowerCaseQuery) ||
        notesMatch ||
        amountMatch
      ) {
        results.push({ type: 'settlement', data: settlement });
      }
    });

    // Search users
    allData.users.forEach(user => {
      if (
        getFullName(user.firstName, user.lastName).toLowerCase().includes(lowerCaseQuery) ||
        user.email.toLowerCase().includes(lowerCaseQuery) ||
        (user.username && user.username.toLowerCase().includes(lowerCaseQuery))
      ) {
        results.push({ type: 'user', data: user });
      }
    });

    return results;
  }, [query, allData]);
  
  const processedResults = useMemo(() => {
    const groupsList: Group[] = [];
    const expensesGrouped: Record<string, { group: Group; items: Expense[] }> = {};
    const settlementsGrouped: Record<string, { group: Group; items: Settlement[] }> = {};
    const usersList: UserProfile[] = [];

    searchResults.forEach(result => {
      if (result.type === 'group') {
        groupsList.push(result.data);
      } else if (result.type === 'user') {
        usersList.push(result.data);
      } else if (result.type === 'expense') {
        const expense = result.data;
        const group = allData?.groups.find(g => g.id === expense.groupId);
        if (group) {
          if (!expensesGrouped[expense.groupId]) {
            expensesGrouped[expense.groupId] = { group, items: [] };
          }
          expensesGrouped[expense.groupId].items.push(expense);
        }
      } else if (result.type === 'settlement') {
        const settlement = result.data;
        const group = allData?.groups.find(g => g.id === settlement.groupId);
        if (group) {
          if (!settlementsGrouped[settlement.groupId]) {
            settlementsGrouped[settlement.groupId] = { group, items: [] };
          }
          settlementsGrouped[settlement.groupId].items.push(settlement);
        }
      }
    });

    return {
      groups: groupsList,
      expensesByGroup: Object.values(expensesGrouped),
      settlementsByGroup: Object.values(settlementsGrouped),
      users: usersList,
    };
  }, [searchResults, allData]);

  const handleSelectResult = (result: SearchResult, path: string) => {
    let title = '';
    let subtitle = '';
    let id = '';
    
    if (result.type === 'group') {
       title = result.data.name;
       id = result.data.id;
    } else if (result.type === 'expense') {
       title = result.data.description;
       subtitle = allData?.groups.find(g => g.id === result.data.groupId)?.name || '';
       id = result.data.id;
    } else if (result.type === 'settlement') {
       title = `${getFullName(result.data.paidBy?.firstName, result.data.paidBy?.lastName)} to ${getFullName(result.data.paidTo?.firstName, result.data.paidTo?.lastName)}`;
       subtitle = allData?.groups.find(g => g.id === result.data.groupId)?.name || '';
       id = result.data.id;
    } else if (result.type === 'user') {
       title = getFullName(result.data.firstName, result.data.lastName);
       subtitle = result.data.email;
       id = result.data.uid;
    }

    const newRecent: RecentSearch = { id, type: result.type, title, subtitle, url: path };

    setRecentSearches(prev => {
       const filtered = prev.filter(r => r.id !== newRecent.id);
       const next = [newRecent, ...filtered].slice(0, 5);
       localStorage.setItem('recentSearches', JSON.stringify(next));
       return next;
    });

    router.push(path);
    setOpen(false);
  };

  const handleRecentClick = (recent: RecentSearch) => {
    router.push(recent.url);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full md:w-1/2 lg:w-1/3 flex items-center gap-2 p-2 text-sm text-muted-foreground border border-input rounded-md hover:bg-muted transition-colors"
      >
        <Icons.Search className="h-4 w-4" />
        Search...
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:m-0 max-sm:rounded-none max-sm:border-none sm:max-w-3xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-md border border-border/20 shadow-2xl animate-in duration-200 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center border-b border-border/20 px-4 bg-muted/15 focus-within:bg-muted/30 transition-colors h-14">
            <Icons.Search className="h-5 w-5 text-muted-foreground/75 flex-shrink-0" />
            <Input
              placeholder="Search groups, expenses, settlements, friends..."
              className="border-0 h-full text-base shadow-none !bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 pr-4 flex-1 placeholder:text-muted-foreground/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery('')}
                className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 rounded-lg mr-1 shrink-0"
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="hidden sm:inline-flex pointer-events-none select-none items-center gap-1 rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground/80">
                  ESC
                </kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 rounded-lg shrink-0"
                  title="Close Search"
                >
                  <Icons.Close className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-[calc(100dvh-52px)] sm:h-[500px]">
            <div className="p-3 sm:p-5 space-y-6">
              {loading && (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <Icons.AppLogo className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Indexing data...</p>
                </div>
              )}
              {!loading && !query && (
                <div className="py-4">
                  {recentSearches.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 px-2 flex items-center gap-2">
                        <Icons.History className="h-3.5 w-3.5" /> Recent Searches
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recentSearches.map(recent => (
                          <div
                            key={recent.id}
                            onClick={() => handleRecentClick(recent)}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted/30 transition-all cursor-pointer group"
                          >
                            <Icons.History className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">{recent.title}</p>
                              {recent.subtitle && <p className="text-[11px] text-muted-foreground truncate">{recent.subtitle}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground space-y-3">
                      <Icons.Search className="mx-auto h-12 w-12 text-muted-foreground/40 animate-pulse" />
                      <div>
                        <p className="font-bold text-lg text-foreground">Start typing to search</p>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Find groups, expenses, settlements, or friends instantly.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!loading && query && searchResults.length === 0 && (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                  <Icons.SearchX className="mx-auto h-12 w-12 text-muted-foreground/45" />
                  <div>
                    <p className="font-bold text-lg text-foreground">No results found</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">We couldn&apos;t find anything matching &quot;{query}&quot;.</p>
                  </div>
                </div>
              )}

              {/* Groups Results */}
              {!loading && query && processedResults.groups.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Icons.Users className="h-3.5 w-3.5 text-primary" />
                    <span>Groups ({processedResults.groups.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {processedResults.groups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => handleSelectResult({ type: 'group', data: group }, `/groups/${group.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 rounded-lg border border-border/10">
                            <AvatarImage src={group.coverImageUrl} />
                            <AvatarFallback className="rounded-lg">{getInitials(group.name)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">{group.name}</p>
                            <p className="text-[11px] text-muted-foreground">{group.members?.length || 0} members</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses Results Grouped by Group */}
              {!loading && query && processedResults.expensesByGroup.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Icons.Expense className="h-3.5 w-3.5 text-blue-500" />
                    <span>Expenses ({processedResults.expensesByGroup.reduce((sum, g) => sum + g.items.length, 0)})</span>
                  </div>
                  <div className="space-y-3">
                    {processedResults.expensesByGroup.map(({ group, items }) => (
                      <div key={group.id} className="rounded-xl border border-border/20 bg-muted/5 overflow-hidden">
                        <div className="bg-muted/15 px-3.5 py-1.5 border-b border-border/10 flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Folder className="h-3 w-3 text-muted-foreground/75" />
                            {group.name}
                          </span>
                        </div>
                        <div className="divide-y divide-border/10">
                          {items.map(expense => (
                            <div
                              key={expense.id}
                              onClick={() => handleSelectResult({ type: 'expense', data: expense }, `/groups/${expense.groupId}`)}
                              className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                  <Icons.Expense className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{expense.description}</p>
                                  <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 flex-wrap">
                                    <span>Paid by {expense.payers?.map(p => getFullName(p.user?.firstName, p.user?.lastName)).join(', ')}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-semibold uppercase">{expense.category}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-sm">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/45 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settlements Results Grouped by Group */}
              {!loading && query && processedResults.settlementsByGroup.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Icons.Settle className="h-3.5 w-3.5 text-green-500" />
                    <span>Settlements ({processedResults.settlementsByGroup.reduce((sum, g) => sum + g.items.length, 0)})</span>
                  </div>
                  <div className="space-y-3">
                    {processedResults.settlementsByGroup.map(({ group, items }) => (
                      <div key={group.id} className="rounded-xl border border-border/20 bg-muted/5 overflow-hidden">
                        <div className="bg-muted/15 px-3.5 py-1.5 border-b border-border/10 flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Folder className="h-3 w-3 text-muted-foreground/75" />
                            {group.name}
                          </span>
                        </div>
                        <div className="divide-y divide-border/10">
                          {items.map(settlement => (
                            <div
                              key={settlement.id}
                              onClick={() => handleSelectResult({ type: 'settlement', data: settlement }, `/settlements`)}
                              className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                  <Icons.Settle className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                    {getFullName(settlement.paidBy?.firstName, settlement.paidBy?.lastName)} &rarr; {getFullName(settlement.paidTo?.firstName, settlement.paidTo?.lastName)}
                                  </p>
                                  {settlement.notes && (
                                    <p className="text-[11px] text-muted-foreground truncate">Note: {settlement.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-sm text-green-500">{CURRENCY_SYMBOL}{settlement.amount.toFixed(2)}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/45 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members/Users Results */}
              {!loading && query && processedResults.users.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Icons.Users className="h-3.5 w-3.5 text-purple-500" />
                    <span>Members & Friends ({processedResults.users.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {processedResults.users.map(user => {
                      const link = userProfile?.role === 'admin' ? `/admin/users/${user.uid}/edit` : '#';
                      return (
                        <div
                          key={user.uid}
                          onClick={() => link !== '#' && handleSelectResult({ type: 'user', data: user }, link)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border border-border/20 bg-muted/10 transition-all group",
                            link !== '#' ? "hover:bg-muted/30 cursor-pointer" : "opacity-85"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 border border-border/10">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">{getFullName(user.firstName, user.lastName)}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                          {link !== '#' && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
