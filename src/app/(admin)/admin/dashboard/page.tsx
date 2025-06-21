
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Admin Dashboard - SettleEase',
  description: 'Manage users, groups, and system settings.',
};

const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

export default async function AdminDashboardPage() {
    const [users, groups, expenses] = await Promise.all([
        getAllUsers(),
        getAllGroups(),
        getAllExpenses(),
    ]);

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
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
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
                                            <p className="text-xs text-muted-foreground">by {group.createdBy.name}</p>
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
