'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
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
import { getAllUsers, deleteUser, deleteUsersMass, updateUserRoleMass } from '@/lib/firestore.service';
import type { UserProfile } from '@/types';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Search, UserCheck, Shield, Trash2, Edit3, X, Filter, Users as UsersIcon } from 'lucide-react';

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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = filteredUsers.map((u) => u.uid);
      setSelectedUserIds(selectableIds);
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
        title: 'Role Updated',
        description: `Updated ${selectedUserIds.length} user(s) to ${newRole}.`,
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
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-primary" /> Manage Users
          </h1>
          <p className="text-muted-foreground">Search, filter, edit details, and run mass operations on user accounts.</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-md rounded-2xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or username..."
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
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                <SelectTrigger className="h-11 w-full sm:w-40 rounded-xl bg-muted/20 border-border/30">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users Only</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating / Sticky Mass Action Bar */}
      {selectedUserIds.length > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="rounded-lg px-3 py-1 text-xs font-bold">
              {selectedUserIds.length} Selected
            </Badge>
            <span className="text-xs font-medium text-foreground/80 hidden sm:inline">Perform mass operations on selected users</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMassRoleChange('admin')}
              className="h-9 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" /> Make Admin
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMassRoleChange('user')}
              className="h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            >
              <UserCheck className="h-3.5 w-3.5" /> Make User
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMassDeleteOpen(true)}
              className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])} className="h-9 rounded-xl text-muted-foreground">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="border-b border-border/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Users Directory</CardTitle>
              <CardDescription>
                Showing {filteredUsers.length} of {users.length} registered accounts.
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
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all users" />
                  </TableHead>
                  <TableHead className="w-[35%]">User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No users found matching your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isMainAdmin = user.email === 'jangrayash1505@gmail.com';
                    const isSelected = selectedUserIds.includes(user.uid);

                    return (
                      <TableRow key={user.uid} className={cn('border-b border-border/10 transition-colors', isSelected && 'bg-primary/5')}>
                        <TableCell className="text-center pl-6">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(user.uid, !!checked)}
                            aria-label={`Select ${user.firstName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border/30 rounded-xl">
                              <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                              <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{getFullName(user.firstName, user.lastName)}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">@{user.username}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                            className={cn(
                              'rounded-lg px-2.5 py-0.5 font-medium text-xs',
                              user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-muted/40 text-muted-foreground'
                            )}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* Direct Neutral Edit Button */}
                            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-border/30 px-3 text-xs font-medium gap-1.5 transition-all">
                              <Link href={`/admin/users/${user.uid}/edit`}>
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </Link>
                            </Button>

                            {/* Direct Delete Button (Red on Hover) */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setUserToDelete(user)}
                              disabled={isMainAdmin}
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

      {/* Single User Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-bold text-foreground">{userToDelete && getFullName(userToDelete.firstName, userToDelete.lastName)}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSingleDelete} disabled={isDeleting} className="rounded-xl bg-destructive hover:bg-destructive/90 gap-2">
              {isDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedUserIds.length} Selected Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected user accounts from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} disabled={isMassDeleting} className="rounded-xl bg-destructive hover:bg-destructive/90 gap-2">
              {isMassDeleting ? <Icons.AppLogo className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Selected Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
