
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
  open: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'in-progress': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  closed: 'bg-muted text-muted-foreground border border-border/40',
};

function TicketActions({ ticket, onActionComplete }: { ticket: SupportTicket; onActionComplete: () => void }) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleMarkAsClosed = async () => {
    setIsUpdating(true);
    try {
      await updateTicket(ticket.id, { status: 'closed' });
      toast({ title: 'Ticket Closed', description: `Ticket #${ticket.id.slice(0, 8)} has been marked as closed.` });
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
      toast({ title: 'Ticket Deleted', description: `Ticket #${ticket.id.slice(0, 8)} has been permanently deleted.` });
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
      <div className="flex items-center justify-end gap-1.5">
        <Button asChild size="sm" variant="outline" className="h-7 rounded-md border-border px-2 text-xs font-medium gap-1 hover:bg-primary/10 hover:text-primary transition-colors">
          <Link href={`/admin/support/${ticket.id}`}>
            <Icons.Edit className="h-3 w-3" /> View
          </Link>
        </Button>
        {ticket.status !== 'closed' && (
          <Button size="sm" variant="outline" onClick={handleMarkAsClosed} disabled={isUpdating} className="h-7 rounded-md border-border px-2 text-xs font-medium gap-1 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20">
            Close
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setIsDeleteDialogOpen(true)} className="h-7 rounded-md border-border px-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
          <Icons.Delete className="h-3 w-3" />
        </Button>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will permanently delete the ticket "{ticket.subject}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 rounded-lg text-xs font-bold border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="h-8 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Icons.AppLogo className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ManageSupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    const ticketList = await getAllTickets();
    setTickets(ticketList);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/40 text-foreground border border-border">
            <Icons.Help className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Support Tickets</h1>
            <p className="text-xs text-muted-foreground">Manage and respond to user support inquiries.</p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-bold font-mono border-border bg-muted/40 px-3 py-1">
          {tickets.length} Total Tickets
        </Badge>
      </div>

      {/* High-Density Support Table Card */}
      <Card className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 pl-4">Subject</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2.5">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2.5">User</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2.5">Last Updated</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-2 pl-4">
                      <p className="font-bold text-xs text-foreground truncate max-w-xs">{ticket.subject}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{ticket.category} • ID: {ticket.id.slice(0, 8)}</p>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', statusStyles[ticket.status])}>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <p className="text-xs font-bold text-foreground">{ticket.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{ticket.userEmail}</p>
                    </TableCell>
                    <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="py-2 text-right pr-4">
                      <TicketActions ticket={ticket} onActionComplete={fetchTickets} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {tickets.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">
                <Icons.Help className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-xs">No support tickets found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
