'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
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
import { getAllUsers, deleteUser, deleteUsersMass, updateUserRoleMass } from '@/lib/firestore.service';
import type { UserProfile } from '@/types';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Search, UserCheck, Shield, Trash2, Edit3, X, Users as UsersIcon, ShieldAlert, Sparkles } from 'lucide-react';

export default function ManageUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Multi-select state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isMassDeleting, setIsMassDeleting] = useState(false);
  const [isMassDeleteOpen, setIsMassDeleteOpen] = useState(false);

  // Single Delete state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load users list.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const fullName = getFullName(u.firstName, u.lastName).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || fullName.includes(query) || email.includes(query) || username.includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Statistics
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const userCount = useMemo(() => users.filter((u) => u.role === 'user').length, [users]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.uid));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectOne = (uid: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, uid]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== uid));
    }
  };

  // Mass Role Change
  const handleMassRoleChange = async (newRole: 'admin' | 'user') => {
    if (selectedUserIds.length === 0) return;
    try {
      await updateUserRoleMass(selectedUserIds, newRole);
      toast({
        title: 'Roles Updated',
        description: `Successfully updated ${selectedUserIds.length} user(s) to ${newRole}.`,
      });
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Mass Action Failed',
        description: error.message || 'Could not update user roles.',
      });
    }
  };

  // Mass Delete
  const handleMassDelete = async () => {
    if (selectedUserIds.length === 0) return;
    setIsMassDeleting(true);
    try {
      await deleteUsersMass(selectedUserIds);
      toast({
        title: 'Users Deleted',
        description: `Successfully deleted ${selectedUserIds.length} user(s).`,
      });
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Mass Delete Failed',
        description: error.message || 'Failed to delete selected users.',
      });
    } finally {
      setIsMassDeleting(false);
      setIsMassDeleteOpen(false);
    }
  };

  // Single User Delete
  const handleSingleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.uid);
      toast({
        title: 'User Deleted',
        description: `Successfully deleted ${getFullName(userToDelete.firstName, userToDelete.lastName)}.`,
      });
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete user.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.uid));

  if (loading) {
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
            User Accounts <span className="text-xs font-mono font-normal text-muted-foreground">({users.length})</span>
          </h1>
          <p className="text-xs text-muted-foreground">Manage user roles, accounts, and permissions.</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-foreground border-border">
            Total: {users.length}
          </Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-foreground border-border">
            Admins: {adminCount}
          </Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border-border">
            Users: {userCount}
          </Badge>
        </div>
      </div>

      {/* Unified Sticky Search & Actions Bar (Sticky directly under header top-12 / 48px) */}
      <div className="sticky top-[48px] z-30 p-1 rounded-md bg-card border border-border flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            placeholder={selectedUserIds.length > 0 ? `Search among ${selectedUserIds.length} selected users...` : "Search users..."}
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
          {selectedUserIds.length > 0 ? (
            <>
              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] font-bold border-border bg-muted text-foreground">
                {selectedUserIds.length} selected
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMassDeleteOpen(true)}
                className="h-7 rounded-md border-border text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])} className="h-7 rounded-md text-xs text-muted-foreground hover:text-foreground">
                Clear
              </Button>
            </>
          ) : (
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="h-7 w-28 rounded-md bg-muted/40 border-0 text-xs font-medium focus:ring-0">
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-border">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users Only</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
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
                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all users" />
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">User Profile</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Username</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Role</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">Joined</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  No user accounts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const isMainAdmin = user.email === 'jangrayash1505@gmail.com';
                const isSelected = selectedUserIds.includes(user.uid);

                return (
                  <TableRow key={user.uid} className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', isSelected && 'bg-muted/40')}>
                    <TableCell className="text-center pl-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(user.uid, !!checked)}
                        aria-label={`Select ${user.firstName}`}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border rounded-lg">
                          <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                          <AvatarFallback className="rounded-lg font-bold bg-muted text-foreground text-xs">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground truncate">{getFullName(user.firstName, user.lastName)}</p>
                            {isMainAdmin && (
                              <Badge className="bg-muted text-foreground border border-border text-[10px] px-1.5 py-0 font-bold uppercase rounded-md">
                                Superadmin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
                        @{user.username}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="rounded-md px-2.5 py-0.5 font-bold text-xs uppercase tracking-wider bg-muted text-foreground border border-border">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border-border px-3 text-xs font-medium gap-1.5 hover:bg-muted"
                        >
                          <Link href={`/admin/users/${user.uid}/edit`}>
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </Link>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUserToDelete(user)}
                          disabled={isMainAdmin}
                          className="h-8 rounded-md border-border px-3 text-xs font-medium gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-30"
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

      {/* Single User Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/30 bg-card/90 backdrop-blur-2xl p-6 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete <span className="font-bold text-foreground">{userToDelete && getFullName(userToDelete.firstName, userToDelete.lastName)}</span>? All account profile data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl h-10 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSingleDelete} disabled={isDeleting} className="rounded-xl h-10 text-sm bg-destructive hover:bg-destructive/90 gap-2">
              {isDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-border/30 bg-card/90 backdrop-blur-2xl p-6 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Delete {selectedUserIds.length} Selected Users?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1">
              This will permanently delete the selected user accounts from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl h-10 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} disabled={isMassDeleting} className="rounded-xl h-10 text-sm bg-destructive hover:bg-destructive/90 gap-2">
              {isMassDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Selected Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
