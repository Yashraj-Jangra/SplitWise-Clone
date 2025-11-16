
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
import type { Group, Expense, UserProfile } from '@/types';
import { getAllGroups, getAllExpenses, hydrateUsers } from '@/lib/mock-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFullName, getInitials } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';

type SearchResult =
  | { type: 'group'; data: Group }
  | { type: 'expense'; data: Expense }
  | { type: 'user'; data: UserProfile };

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<{
    groups: Group[];
    expenses: Expense[];
    users: UserProfile[];
  } | null>(null);

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

  const loadAllData = useCallback(async () => {
    if (!userProfile?.uid) return;
    setLoading(true);

    const userGroups = await getAllGroups();
    const filteredGroups = userGroups.filter(g => g.memberIds.includes(userProfile.uid));
    
    const allExpenses = await getAllExpenses();
    const filteredExpenses = allExpenses.filter(e => e.groupMemberIds.includes(userProfile.uid));

    const mutualMemberIds = new Set<string>();
    filteredGroups.forEach(group => {
        group.memberIds.forEach(id => mutualMemberIds.add(id));
    });
    
    // Remove current user from the list of users to display
    mutualMemberIds.delete(userProfile.uid);

    const mutualUsers = await hydrateUsers(Array.from(mutualMemberIds));

    setAllData({
      groups: filteredGroups,
      expenses: filteredExpenses,
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

    const lowerCaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search groups
    allData.groups.forEach(group => {
      if (group.name.toLowerCase().includes(lowerCaseQuery)) {
        results.push({ type: 'group', data: group });
      }
    });

    // Search expenses
    allData.expenses.forEach(expense => {
      if (
        expense.description.toLowerCase().includes(lowerCaseQuery) ||
        (expense.category &&
          expense.category.toLowerCase().includes(lowerCaseQuery)) ||
        (expense.notes && expense.notes.toLowerCase().includes(lowerCaseQuery))
      ) {
        results.push({ type: 'expense', data: expense });
      }
    });

    // Search users
    allData.users.forEach(user => {
      if (
        getFullName(user.firstName, user.lastName)
          .toLowerCase()
          .includes(lowerCaseQuery) ||
        user.email.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({ type: 'user', data: user });
      }
    });

    return results;
  }, [query, allData]);
  
  const groupedResults = useMemo(() => {
    return searchResults.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<SearchResult['type'], SearchResult[]>);
  }, [searchResults]);

  const handleSelect = (path: string) => {
    router.push(path);
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
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center border-b px-4">
            <Icons.Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for groups, expenses, users..."
              className="border-0 h-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none bg-transparent pl-3"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="h-96">
            <div className="p-2">
              {loading && (
                <div className="text-center py-4 text-muted-foreground">
                  <Icons.AppLogo className="mx-auto h-8 w-8 animate-spin" />
                  <p>Indexing data...</p>
                </div>
              )}
               {!loading && !query && (
                 <div className="text-center py-8 text-muted-foreground">
                    <Icons.Search className="mx-auto h-12 w-12" />
                    <p className="mt-2 font-semibold">Start typing to search</p>
                    <p className="text-sm">Find anything in your workspace instantly.</p>
                </div>
              )}
              {!loading && query && searchResults.length === 0 && (
                 <div className="text-center py-8 text-muted-foreground">
                    <Icons.SearchX className="mx-auto h-12 w-12" />
                    <p className="mt-2 font-semibold">No results found</p>
                    <p className="text-sm">Try a different search term.</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(groupedResults).map(([type, results]) => (
                    <div key={type}>
                        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">{type}</h3>
                        <div className="space-y-1">
                            {results.map(result => {
                                if (result.type === 'group') {
                                    const { data: group } = result;
                                    return (
                                        <div key={group.id} onClick={() => handleSelect(`/groups/${group.id}`)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                                            <Avatar className="h-8 w-8"><AvatarImage src={group.coverImageUrl}/><AvatarFallback>{getInitials(group.name)}</AvatarFallback></Avatar>
                                            <p className="font-medium text-sm">{group.name}</p>
                                        </div>
                                    )
                                }
                                if (result.type === 'expense') {
                                    const { data: expense } = result;
                                    return (
                                        <div key={expense.id} onClick={() => handleSelect(`/groups/${expense.groupId}`)} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                 <Icons.Expense className="h-6 w-6 text-muted-foreground"/>
                                                 <div>
                                                    <p className="font-medium text-sm">{expense.description}</p>
                                                    <p className="text-xs text-muted-foreground">{allData?.groups.find(g => g.id === expense.groupId)?.name}</p>
                                                 </div>
                                            </div>
                                            <p className="font-semibold text-sm">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
                                        </div>
                                    )
                                }
                                if (result.type === 'user') {
                                    const { data: user } = result;
                                    const link = userProfile?.role === 'admin' ? `/admin/users/${user.uid}/edit` : '#';
                                    return (
                                         <div key={user.uid} onClick={() => link !== '#' && handleSelect(link)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                                            <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl}/><AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{getFullName(user.firstName, user.lastName)}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    )
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
