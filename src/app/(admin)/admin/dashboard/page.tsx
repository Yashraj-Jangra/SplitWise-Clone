
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Group, Expense } from '@/types';
import { OverviewCard } from "@/components/dashboard/overview-card";
import { getAllUsers, getAllGroups, getAllExpenses } from "@/lib/mock-data";
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getFullName, getInitials } from '@/lib/utils';

interface AdminData {
    users: UserProfile[];
    groups: Group[];
    expenses: Expense[];
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [users, groups, expenses] = await Promise.all([
                    getAllUsers(),
                    getAllGroups(),
                    getAllExpenses(),
                ]);
                setData({ users, groups, expenses });
            } catch (error) {
                console.error("Error fetching admin data:", error);
                toast({
                    variant: "destructive",
                    title: "Failed to load dashboard",
                    description: "Could not fetch admin data. You might be missing permissions.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }
    
    if (!data) {
         return (
             <div className="text-center p-10">
                <p>Failed to load data. Please try again later.</p>
             </div>
         )
    }

    const { users, groups, expenses } = data;
    const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const recentUsers = [...users].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);
    const recentGroups = [...groups].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">System-wide overview and statistics.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <OverviewCard title="Total Users" value={users.length} iconName="Users" description="Total registered users." />
                <OverviewCard title="Total Groups" value={groups.length} iconName="Users" description="Total groups created." />
                <OverviewCard title="Total Expenses" value={expenses.length} iconName="Expense" description="Total expenses logged." />
                <OverviewCard title="Total Volume" value={totalExpenseAmount.toFixed(2)} isCurrency iconName="Wallet" description={`Total value of all expenses in ${CURRENCY_SYMBOL}.`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                        <CardDescription>The last 5 users who joined.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {recentUsers.map(user => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                                                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{getFullName(user.firstName, user.lastName)}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">{formatDistanceToNow(new Date(user.createdAt!), { addSuffix: true })}</TableCell>
                                </TableRow>
                            ))}
                         </TableBody>
                       </Table>
                       <Button variant="outline" size="sm" asChild className="mt-4 w-full">
                            <Link href="/admin/users">View All Users</Link>
                       </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Recent Groups</CardTitle>
                        <CardDescription>The last 5 groups created.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group</TableHead>
                                    <TableHead className="text-right">Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentGroups.map(group => (
                                    <TableRow key={group.id}>
                                        <TableCell>
                                            <p className="font-medium">{group.name}</p>
                                            <p className="text-xs text-muted-foreground">by {getFullName(group.createdBy.firstName, group.createdBy.lastName)}</p>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Button variant="outline" size="sm" asChild className="mt-4 w-full">
                            <Link href="/admin/groups">View All Groups</Link>
                       </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
