
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAllGroups } from "@/lib/mock-data";
import { format } from 'date-fns';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { getFullName, getInitials } from '@/lib/utils';
import { useAuth } from "@/contexts/auth-context";
import { writeBatch, query, collection, where, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function GroupActions({ group, onGroupDeleted }: { group: Group, onGroupDeleted: (groupId: string) => void }) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = async () => {
        if (userProfile?.role !== 'admin') {
            toast({ title: "Unauthorized", description: "You do not have permission to delete groups.", variant: "destructive"});
            return;
        }

        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            // Find and delete all related documents
            const collectionsToDelete = ['expenses', 'settlements', 'history'];
            for (const collectionName of collectionsToDelete) {
                const q = query(collection(db, collectionName), where('groupId', '==', group.id));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
            }

            // Delete the group itself
            const groupDocRef = doc(db, 'groups', group.id);
            batch.delete(groupDocRef);

            await batch.commit();
            
            toast({ title: "Group Deleted", description: `The group "${group.name}" and all its data have been permanently deleted.`});
            onGroupDeleted(group.id);

        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
             toast({ title: "Error Deleting Group", description: errorMessage, variant: "destructive"});
        }
        
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
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
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Icons.Delete className="mr-2 h-4 w-4" /> Delete Group
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is irreversible. It will permanently delete the group "{group.name}" and all associated expenses, settlements, and history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-orbit" />}
                            Yes, delete permanently
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
        setGroups(groupList);
        setLoading(false);
    }

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleGroupDeleted = (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

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
                                <TableHead>Created Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.map(group => (
                                <TableRow key={group.id}>
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
                                    <TableCell>{group.members.length > 0 ? group.members.length : <span className="text-muted-foreground">Archived</span>}</TableCell>
                                    <TableCell>{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</TableCell>
                                    <TableCell>{format(new Date(group.createdAt), "PPP")}</TableCell>
                                    <TableCell className="text-right">
                                        <GroupActions group={group} onGroupDeleted={handleGroupDeleted} />
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
