
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAllTickets, deleteTicket, updateTicket } from "@/lib/mock-data";
import { format, formatDistanceToNow } from 'date-fns';
import type { SupportTicket } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const statusStyles: { [key: string]: string } = {
  open: 'bg-green-500/20 text-green-400 border-green-500/50',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  closed: 'bg-red-500/20 text-red-400 border-red-500/50',
};

function TicketActions({ ticket, onActionComplete }: { ticket: SupportTicket, onActionComplete: () => void }) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleMarkAsClosed = async () => {
        setIsUpdating(true);
        try {
            await updateTicket(ticket.id, { status: 'closed' });
            toast({ title: "Ticket Closed", description: `Ticket #${ticket.id.slice(0,8)} has been marked as closed.` });
            onActionComplete();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update ticket status.' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteTicket(ticket.id);
            toast({ title: "Ticket Deleted", description: `Ticket #${ticket.id.slice(0,8)} has been permanently deleted.` });
            onActionComplete();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the ticket.' });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icons.MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ticket Actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/admin/support/${ticket.id}`}>
                            <Icons.Edit className="mr-2 h-4 w-4" /> View/Reply
                        </Link>
                    </DropdownMenuItem>
                     {ticket.status !== 'closed' && (
                        <DropdownMenuItem onClick={handleMarkAsClosed} disabled={isUpdating}>
                            <Icons.ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                            Mark as Closed
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-destructive/10">
                        <Icons.Delete className="mr-2 h-4 w-4" /> Delete Ticket
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the ticket "{ticket.subject}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                           {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, delete ticket
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default function ManageSupportTicketsPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = async () => {
        setLoading(true);
        const ticketList = await getAllTickets();
        setTickets(ticketList);
        setLoading(false);
    }
    
    useEffect(() => {
        fetchTickets();
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
                <h1 className="text-3xl font-bold font-headline text-foreground">Support Tickets</h1>
                <p className="text-muted-foreground">Manage and respond to user support requests.</p>
             </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Tickets ({tickets.length})</CardTitle>
                    <CardDescription>A list of all support tickets submitted by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[45%]">Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map(ticket => (
                                <TableRow key={ticket.id}>
                                    <TableCell>
                                        <p className="font-medium truncate">{ticket.subject}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{ticket.category} / ID: {ticket.id.slice(0, 8)}</p>
                                    </TableCell>
                                     <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", statusStyles[ticket.status])}>
                                            {ticket.status.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium">{ticket.userName}</p>
                                        <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TicketActions ticket={ticket} onActionComplete={fetchTickets} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {tickets.length === 0 && (
                        <div className="text-center p-12 text-muted-foreground">
                            <Icons.Help className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg">No support tickets yet.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
        </div>
    )
}
