'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
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
import { getAllGroups, archiveGroup, restoreGroup, deleteGroupPermanently } from '@/lib/api.client';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Icons } from '@/components/icons';
import { appEventEmitter } from '@/lib/event-emitter';
import { Search, FolderKanban, Archive, RotateCcw, Trash2, Eye, X, ShieldAlert } from 'lucide-react';

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

  // Statistics
  const activeCount = useMemo(() => groups.filter((g) => !g.archivedAt).length, [groups]);
  const archivedCount = useMemo(() => groups.filter((g) => !!g.archivedAt).length, [groups]);

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
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-14 w-1/3 rounded-2xl" />
        <Card className="rounded-2xl border-border/30 bg-card/40">
          <CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sleek Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            Platform Groups <span className="text-xs font-mono font-normal text-muted-foreground">({groups.length})</span>
          </h1>
          <p className="text-xs text-muted-foreground">Inspect, archive, or purge groups across the system.</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-foreground border-border">
            Total: {groups.length}
          </Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-foreground border-border">
            Active: {activeCount}
          </Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border-border">
            Archived: {archivedCount}
          </Badge>
        </div>
      </div>

      {/* Unified Sticky Search & Actions Bar (Sticky directly under top navbar header top-12 / 48px) */}
      <div className="sticky top-[48px] z-30 p-1 rounded-md bg-card border border-border flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            placeholder={selectedGroupIds.length > 0 ? `Search among ${selectedGroupIds.length} selected groups...` : "Search groups..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-7 border-0 bg-transparent focus-visible:ring-0 text-xs placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-l border-border pl-2">
          {selectedGroupIds.length > 0 ? (
            <>
              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] font-bold border-border bg-muted text-foreground">
                {selectedGroupIds.length} selected
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMassArchive}
                className="h-7 rounded-md border-border text-xs font-medium hover:bg-muted gap-1"
              >
                <Archive className="h-3 w-3" /> Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMassRestore}
                className="h-7 rounded-md border-border text-xs font-medium hover:bg-muted gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMassDeleteOpen(true)}
                className="h-7 rounded-md border-border text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedGroupIds([])} className="h-7 rounded-md text-xs text-muted-foreground hover:text-foreground">
                Clear
              </Button>
            </>
          ) : (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-7 w-28 rounded-md bg-muted/40 border-0 text-xs font-medium focus:ring-0">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-border">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="archived">Archived Only</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Sleek High-Legibility Table */}
      <div className="border border-border bg-card rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 text-center pl-4 py-3">
                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all groups" />
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Group Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Created By</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Members</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Total Spend</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  No platform groups found.
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id);
                const isArchived = !!group.archivedAt;

                return (
                  <TableRow key={group.id} className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', isSelected && 'bg-muted/40')}>
                    <TableCell className="text-center pl-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(group.id, !!checked)}
                        aria-label={`Select ${group.name}`}
                      />
                    </TableCell>
                    <TableCell className="py-3 font-bold text-sm text-foreground">{group.name}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-border rounded-md">
                          <AvatarImage src={group.createdBy?.avatarUrl} alt={getFullName(group.createdBy?.firstName, group.createdBy?.lastName)} />
                          <AvatarFallback className="rounded-md text-[10px] font-bold bg-muted text-foreground">
                            {getInitials(group.createdBy?.firstName, group.createdBy?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-muted-foreground">{getFullName(group.createdBy?.firstName, group.createdBy?.lastName)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold border-border bg-muted/40 text-foreground">
                        {group.members?.length || 0} Members
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 font-bold text-xs font-mono text-foreground">
                      {CURRENCY_SYMBOL}{(group.totalExpenses || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-3">
                      {isArchived ? (
                        <Badge className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                          Archived
                        </Badge>
                      ) : (
                        <Badge className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-muted text-foreground border border-border">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border-border px-3 text-xs font-medium gap-1.5 hover:bg-muted"
                        >
                          <Link href={`/groups/${group.id}`}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSingleArchive(group)}
                          className="h-8 rounded-md border-border px-3 text-xs font-medium gap-1.5 hover:bg-muted"
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

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGroupToDelete(group)}
                          className="h-8 rounded-md border-border px-3 text-xs font-medium gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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

      {/* Delete Group Permanent Alert Dialog */}
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => { if (!open) { setGroupToDelete(null); setConfirmDeleteName(''); } }}>
        <AlertDialogContent className="rounded-3xl border-border/30 bg-card/90 backdrop-blur-2xl p-6 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Permanently Delete "{groupToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1">
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
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="rounded-xl h-10 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              disabled={isDeleting || confirmDeleteName !== groupToDelete?.name}
              className="rounded-xl h-10 text-sm bg-destructive hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-border/30 bg-card/90 backdrop-blur-2xl p-6 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Delete {selectedGroupIds.length} Selected Groups?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1">
              This will permanently delete the selected groups and all associated expenses and settlements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl h-10 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} disabled={isMassDeleting} className="rounded-xl h-10 text-sm bg-destructive hover:bg-destructive/90 gap-2">
              {isMassDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Permanently Delete Groups
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
