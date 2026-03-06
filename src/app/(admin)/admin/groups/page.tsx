
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAllGroups, archiveGroup, restoreGroup, deleteGroupPermanently } from "@/lib/mock-data";
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { getFullName, getInitials } from '@/lib/utils';
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FirebaseError } from "firebase/app";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { appEventEmitter } from "@/lib/event-emitter";

function GroupActions({ group, onActionComplete }: { group: Group, onActionComplete: () => void }) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
    const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
    const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);

    const handleArchive = async () => {
        if (!userProfile) return;
        setIsUpdating(true);
        try {
            await archiveGroup(group.id, userProfile.uid);
            toast({ title: "Group Archived", description: `The group "${group.name}" has been archived.`});
            onActionComplete();
        } catch (error) {
             if (error instanceof FirebaseError && error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `/groups/${group.id}`,
                    operation: 'update',
                    requestResourceData: { archivedAt: "..." }
                });
                errorEmitter.emit('permission-error', permissionError);
             } else {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                toast({ title: "Error Archiving Group", description: errorMessage, variant: "destructive"});
             }
        } finally {
            setIsUpdating(false);
            setIsArchiveDialogOpen(false);
        }
    }
    
    const handleRestore = async () => {
        if (!userProfile) return;
        setIsUpdating(true);
        try {
            await restoreGroup(group.id, userProfile.uid);
            toast({ title: "Group Restored", description: `The group "${group.name}" has been restored.`});
            onActionComplete();
        } catch (error) {
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `/groups/${group.id}`,
                    operation: 'update',
                    requestResourceData: { archivedAt: null }
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                toast({ title: "Error Restoring Group", description: errorMessage, variant: "destructive"});
            }
        } finally {
            setIsUpdating(false);
        }
    }

    const handlePermanentDelete = async () => {
        setIsDeletingPermanently(true);
        try {
            await deleteGroupPermanently(group.id);
            toast({ title: "Group Permanently Deleted", description: `The group "${group.name}" and all associated data have been deleted.` });
            onActionComplete();
            appEventEmitter.emit('data-changed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: "Error Deleting Group", description: errorMessage, variant: "destructive" });
        } finally {
            setIsDeletingPermanently(false);
            setIsPermanentDeleteDialogOpen(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icons.MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Group Actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/groups/${group.id}`}>
                            <Icons.Details className="mr-2 h-4 w-4" /> View Group
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {group.archivedAt ? (
                         <DropdownMenuItem onClick={handleRestore} disabled={isUpdating}>
                            <Icons.Restore className="mr-2 h-4 w-4" /> Restore Group
                        </DropdownMenuItem>
                    ) : (
                         <DropdownMenuItem onClick={() => setIsArchiveDialogOpen(true)} className="text-orange-500 focus:text-orange-500 focus:bg-orange-500/10">
                            <Icons.Archive className="mr-2 h-4 w-4" /> Archive Group
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setIsPermanentDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Icons.Delete className="mr-2 h-4 w-4" /> Delete Permanently
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Group "{group.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Archiving this group will make it read-only for all members. After 30 days, the group and all its data will be permanently deleted. This action cannot be undone. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive} disabled={isUpdating} className="bg-orange-500 hover:bg-orange-600">
                            {isUpdating && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, archive it
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             <AlertDialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently Delete "{group.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is irreversible and will delete the group and all its expenses, settlements, and history. Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePermanentDelete} disabled={isDeletingPermanently} variant="destructive">
                            {isDeletingPermanently && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, permanently delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default function ManageGroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const { userProfile } = useAuth();

    const fetchGroups = async () => {
        setLoading(true);
        const groupList = await getAllGroups();
        setGroups(groupList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
    }

    useEffect(() => {
        fetchGroups();
    }, []);

    if (loading || !userProfile) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline text-foreground">Manage Groups</h1>
                <p className="text-muted-foreground">View and manage all groups in the system.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Groups ({groups.length})</CardTitle>
                    <CardDescription>A list of all groups created on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead>Total Expenses</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.map(group => (
                                <TableRow key={group.id} className={cn(group.archivedAt && "bg-muted/50 text-muted-foreground")}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={group.createdBy.avatarUrl} alt={getFullName(group.createdBy.firstName, group.createdBy.lastName)} />
                                                <AvatarFallback>{getInitials(group.createdBy.firstName, group.createdBy.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <span>{getFullName(group.createdBy.firstName, group.createdBy.lastName)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{group.members.length}</TableCell>
                                    <TableCell>{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</TableCell>
                                    <TableCell>
                                        {group.archivedAt ? (
                                            <div>
                                                <Badge variant="destructive">Archived</Badge>
                                                <p className="text-xs">{formatDistanceToNow(new Date(group.archivedAt), { addSuffix: true })}</p>
                                            </div>
                                        ) : (
                                            <Badge variant="secondary">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <GroupActions group={group} onActionComplete={fetchGroups} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
