
'use client'

import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAllGroups } from "@/lib/mock-data";
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import type { Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// export const metadata: Metadata = {
//   title: 'Manage Groups - SettleEase Admin',
//   description: 'View and manage all groups in the system.',
// };

const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

function GroupActions({ group }: { group: Group }) {
    const { toast } = useToast();

    const handleDelete = () => {
        toast({ title: "Delete Group", description: `Deleting group "${group.name}". (Not implemented)`, variant: "destructive"});
    }

    return (
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
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Icons.Delete className="mr-2 h-4 w-4" /> Delete Group
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function ManageGroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            const groupList = await getAllGroups();
            setGroups(groupList);
            setLoading(false);
        }
        fetchGroups();
    }, []);

    if (loading) {
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
                                                <AvatarImage src={group.createdBy.avatarUrl} alt={group.createdBy.name} />
                                                <AvatarFallback>{getInitials(group.createdBy.name)}</AvatarFallback>
                                            </Avatar>
                                            <span>{group.createdBy.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{group.members.length}</TableCell>
                                    <TableCell>{CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}</TableCell>
                                    <TableCell>{format(new Date(group.createdAt), "PPP")}</TableCell>
                                    <TableCell className="text-right">
                                        <GroupActions group={group} />
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
