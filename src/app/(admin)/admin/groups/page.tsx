'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllGroups, archiveGroup, restoreGroup, deleteGroupPermanently } from '@/lib/firestore.service';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Icons } from '@/components/icons';
import { appEventEmitter } from '@/lib/event-emitter';
import { Search, FolderKanban, Archive, RotateCcw, Trash2, Eye, X, Filter } from 'lucide-react';

export default function ManageGroupsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Multi-select state
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isMassDeleting, setIsMassDeleting] = useState(false);
  const [isMassDeleteOpen, setIsMassDeleteOpen] = useState(false);

  // Single Action States
  const [groupToArchive, setGroupToArchive] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const groupList = await getAllGroups();
      setGroups(groupList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load groups list.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Filtered groups list
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const isArchived = !!g.archivedAt;
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'archived' && isArchived) || (statusFilter === 'active' && !isArchived);

      const name = (g.name || '').toLowerCase();
      const creatorName = getFullName(g.createdBy?.firstName, g.createdBy?.lastName).toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || creatorName.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [groups, statusFilter, searchQuery]);

  // Multi-selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroupIds(filteredGroups.map((g) => g.id));
    } else {
      setSelectedGroupIds([]);
    }
  };

  const handleSelectOne = (groupId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroupIds((prev) => [...prev, groupId]);
    } else {
      setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
    }
  };

  // Mass Archive
  const handleMassArchive = async () => {
    if (!userProfile || selectedGroupIds.length === 0) return;
    try {
      for (const id of selectedGroupIds) {
        await archiveGroup(id, userProfile.uid);
      }
      toast({
        title: 'Groups Archived',
        description: `Successfully archived ${selectedGroupIds.length} group(s).`,
      });
      setSelectedGroupIds([]);
      fetchGroups();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Mass Archive Failed',
        description: error.message || 'Failed to archive selected groups.',
      });
    }
  };

  // Mass Restore
  const handleMassRestore = async () => {
    if (!userProfile || selectedGroupIds.length === 0) return;
    try {
      for (const id of selectedGroupIds) {
        await restoreGroup(id, userProfile.uid);
      }
      toast({
        title: 'Groups Restored',
        description: `Successfully restored ${selectedGroupIds.length} group(s).`,
      });
      setSelectedGroupIds([]);
      fetchGroups();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Mass Restore Failed',
        description: error.message || 'Failed to restore selected groups.',
      });
    }
  };

  // Mass Delete
  const handleMassDelete = async () => {
    if (selectedGroupIds.length === 0) return;
    setIsMassDeleting(true);
    try {
      for (const id of selectedGroupIds) {
        await deleteGroupPermanently(id);
      }
      toast({
        title: 'Groups Deleted',
        description: `Permanently deleted ${selectedGroupIds.length} group(s).`,
      });
      setSelectedGroupIds([]);
      fetchGroups();
      appEventEmitter.emit('data-changed');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Mass Delete Failed',
        description: error.message || 'Failed to delete selected groups.',
      });
    } finally {
      setIsMassDeleting(false);
      setIsMassDeleteOpen(false);
    }
  };

  // Single Actions
  const handleSingleArchive = async (group: Group) => {
    if (!userProfile) return;
    try {
      if (group.archivedAt) {
        await restoreGroup(group.id, userProfile.uid);
        toast({ title: 'Group Restored', description: `Restored group "${group.name}".` });
      } else {
        await archiveGroup(group.id, userProfile.uid);
        toast({ title: 'Group Archived', description: `Archived group "${group.name}".` });
      }
      fetchGroups();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'Could not update group status.',
      });
    }
  };

  const handleSingleDelete = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroupPermanently(groupToDelete.id);
      toast({
        title: 'Group Deleted',
        description: `Permanently deleted "${groupToDelete.name}".`,
      });
      setGroupToDelete(null);
      setConfirmDeleteName('');
      fetchGroups();
      appEventEmitter.emit('data-changed');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Failed to delete group.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = filteredGroups.length > 0 && filteredGroups.every((g) => selectedGroupIds.includes(g.id));

  if (loading || !userProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3 sm:w-1/3 rounded-xl" />
        <Card className="rounded-2xl border-border/30">
          <CardHeader>
            <Skeleton className="h-8 w-1/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground flex items-center gap-2">
            <FolderKanban className="h-8 w-8 text-primary" /> Manage Groups
          </h1>
          <p className="text-muted-foreground">View, filter, archive, or permanently delete platform groups.</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-md rounded-2xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups by name or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/20 border-border/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-11 w-full sm:w-40 rounded-xl bg-muted/20 border-border/30">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="archived">Archived Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating / Sticky Mass Action Bar */}
      {selectedGroupIds.length > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="rounded-lg px-3 py-1 text-xs font-bold">
              {selectedGroupIds.length} Selected
            </Badge>
            <span className="text-xs font-medium text-foreground/80 hidden sm:inline">Perform mass operations on selected groups</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleMassArchive}
              className="h-9 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-1.5"
            >
              <Archive className="h-3.5 w-3.5" /> Mass Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMassRestore}
              className="h-9 rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Mass Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMassDeleteOpen(true)}
              className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedGroupIds([])} className="h-9 rounded-xl text-muted-foreground">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Groups Table */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="border-b border-border/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Groups Directory</CardTitle>
              <CardDescription>
                Showing {filteredGroups.length} of {groups.length} created groups.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/20 hover:bg-transparent">
                  <TableHead className="w-12 text-center pl-6">
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all groups" />
                  </TableHead>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Total Expenses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No groups found matching your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    const isArchived = !!group.archivedAt;

                    return (
                      <TableRow key={group.id} className={cn('border-b border-border/10 transition-colors', isSelected && 'bg-primary/5', isArchived && 'bg-muted/20')}>
                        <TableCell className="text-center pl-6">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(group.id, !!checked)}
                            aria-label={`Select ${group.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-border/30 rounded-lg">
                              <AvatarImage src={group.createdBy?.avatarUrl} alt={getFullName(group.createdBy?.firstName, group.createdBy?.lastName)} />
                              <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                                {getInitials(group.createdBy?.firstName, group.createdBy?.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-foreground/80">{getFullName(group.createdBy?.firstName, group.createdBy?.lastName)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/30">
                            {group.members?.length || 0} Members
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {CURRENCY_SYMBOL}{(group.totalExpenses || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isArchived ? (
                            <Badge variant="destructive" className="rounded-lg px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* Direct Neutral View Button */}
                            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-border/30 px-3 text-xs font-medium gap-1.5 transition-all">
                              <Link href={`/groups/${group.id}`}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Link>
                            </Button>

                            {/* Direct Archive/Restore Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSingleArchive(group)}
                              className={cn(
                                'h-8 rounded-lg border-border/30 px-3 text-xs font-medium gap-1.5 transition-all',
                                isArchived
                                  ? 'text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                                  : 'text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30'
                              )}
                            >
                              {isArchived ? (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="h-3.5 w-3.5" /> Archive
                                </>
                              )}
                            </Button>

                            {/* Direct Delete Permanently Button (Red on Hover) */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setGroupToDelete(group)}
                              className="h-8 rounded-lg border-border/30 px-3 text-xs font-medium gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Group Permanent Alert Dialog */}
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => { if (!open) { setGroupToDelete(null); setConfirmDeleteName(''); } }}>
        <AlertDialogContent className="rounded-2xl border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete "{groupToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible and will permanently delete this group along with all expenses, settlements, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              To confirm, type <span className="font-bold text-foreground">{groupToDelete?.name}</span> below:
            </p>
            <Input
              value={confirmDeleteName}
              onChange={(e) => setConfirmDeleteName(e.target.value)}
              placeholder="Type group name to confirm"
              className="h-10 rounded-xl border-destructive/50 focus-visible:ring-destructive text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              disabled={isDeleting || confirmDeleteName !== groupToDelete?.name}
              className="rounded-xl bg-destructive hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedGroupIds.length} Selected Groups?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected groups and all associated expenses and settlements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} disabled={isMassDeleting} className="rounded-xl bg-destructive hover:bg-destructive/90 gap-2">
              {isMassDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Permanently Delete Groups
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
