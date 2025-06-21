
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
import type { User } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Metadata can't be exported from client components. We'll set this in the layout or handle it differently.
// export const metadata: Metadata = {
//   title: 'Manage Users - SettleEase Admin',
//   description: 'View and manage all user accounts.',
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

function UserActions({ user }: { user: User }) {
    const { toast } = useToast();

    const handleEdit = () => {
        toast({ title: "Edit User", description: `Editing ${user.name}. (Not implemented)`});
    }

    const handleDelete = () => {
        toast({ title: "Delete User", description: `Deleting ${user.name}. (Not implemented)`, variant: "destructive"});
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
                <DropdownMenuItem onClick={handleEdit}>
                    <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Icons.Delete className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function ManageUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
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
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
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
