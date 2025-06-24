
'use client'

import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAllUsers } from "@/lib/mock-data";
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getFullName, getInitials } from '@/lib/utils';

// Metadata can't be exported from client components. We'll set this in the layout or handle it differently.
// export const metadata: Metadata = {
//   title: 'Manage Users - SettleEase Admin',
//   description: 'View and manage all user accounts.',
// };

function UserActions({ user }: { user: UserProfile }) {
    const { toast } = useToast();
    const isMainAdmin = user.email === 'jangrayash1505@gmail.com';

    const handleDelete = () => {
        if (isMainAdmin) {
            toast({
                variant: "destructive",
                title: "Action Not Allowed",
                description: "The main admin account cannot be deleted.",
            });
            return;
        }
        toast({ title: "Delete User", description: `Deleting ${getFullName(user.firstName, user.lastName)}. (Not implemented)`, variant: "destructive"});
    }

    return (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Icons.MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">User Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.uid}/edit`}>
                        <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={handleDelete} 
                    disabled={isMainAdmin}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                    <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function ManageUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const userList = await getAllUsers();
            setUsers(userList);
            setLoading(false);
        }
        fetchUsers();
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
                <h1 className="text-3xl font-bold font-headline text-foreground">Manage Users</h1>
                <p className="text-muted-foreground">View and manage all user accounts in the system.</p>
             </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Users ({users.length})</CardTitle>
                    <CardDescription>A list of all registered users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[40%]'>User</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                                                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{getFullName(user.firstName, user.lastName)}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">@{user.username}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.createdAt ? format(new Date(user.createdAt), "PPP") : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <UserActions user={user} />
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
