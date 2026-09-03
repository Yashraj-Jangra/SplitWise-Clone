
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { SupportTicket, SupportTicketMessage } from '@/types';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getFullName, getInitials, cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';


const replySchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

const statusStyles: { [key: string]: string } = {
  open: 'bg-green-500/20 text-green-400 border-green-500/50',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  closed: 'bg-red-500/20 text-red-400 border-red-500/50',
};

async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const res = await fetch(`/api/admin/tickets?ticketId=${ticketId}`);
  if (!res.ok) return null;
  return res.json();
}


export default function TicketDetailPage() {
    const params = useParams();
    const ticketId = params.ticketId as string;
    const { userProfile: adminProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDraftingReply, setIsDraftingReply] = useState(false);

    const replyForm = useForm<ReplyFormValues>({
        resolver: zodResolver(replySchema),
        defaultValues: { message: '' },
    });

    const handleDraftAiReply = async () => {
        setIsDraftingReply(true);
        try {
            const res = await fetch('/api/ai/draft-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to draft reply');
            }
            const data = await res.json();
            if (data?.draft) {
                replyForm.setValue('message', data.draft, { shouldValidate: true, shouldDirty: true });
                toast({
                    title: '✨ AI Reply Drafted',
                    description: 'Draft generated. Please review and edit before sending.',
                });
            }
        } catch (err: any) {
            toast({
                title: 'Drafting Failed',
                description: err.message || 'Could not generate reply draft.',
                variant: 'destructive',
            });
        } finally {
            setIsDraftingReply(false);
        }
    };

    useEffect(() => {
        async function fetchTicket() {
            setLoading(true);
            const fetchedTicket = await getTicketById(ticketId);
            if (!fetchedTicket) {
                notFound();
            } else {
                setTicket(fetchedTicket);
            }
            setLoading(false);
        }
        if (ticketId) {
            fetchTicket();
        }
    }, [ticketId]);

    const handleReplySubmit = async (values: ReplyFormValues, sendEmail: boolean) => {
        if (!adminProfile || !ticket) return;

        try {
            const res = await fetch('/api/support/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    replyMessage: values.message
                })
            });

            if (!res.ok) throw new Error('Failed to send reply');

            // Re-fetch ticket to show new message
            const updatedTicket = await getTicketById(ticketId);
            setTicket(updatedTicket);
            replyForm.reset();
            toast({ title: "Reply Sent", description: "Your reply has been added to the ticket." });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to send reply.' });
        }
    };
    
    const handleStatusChange = async (newStatus: SupportTicket['status']) => {
        if (!ticket) return;
        try {
            const res = await fetch('/api/admin/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: ticket.id, status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');

            setTicket(prev => prev ? {...prev, status: newStatus} : null);
            toast({ title: 'Status Updated' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    }

    if (loading || authLoading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    if (!ticket) {
        return <Card><CardHeader><CardTitle>Ticket not found.</CardTitle></CardHeader></Card>;
    }
    
    const user = ticket.user;

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">{ticket.subject}</CardTitle>
                        <CardDescription>
                            Ticket #{ticket.id.slice(0, 8)} • Last updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {ticket.messages.map((msg, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <Avatar>
                                    <AvatarImage src={msg.sentBy.avatarUrl} alt={getFullName(msg.sentBy.firstName, msg.sentBy.lastName)} />
                                    <AvatarFallback>{getInitials(msg.sentBy.firstName, msg.sentBy.lastName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold">{getFullName(msg.sentBy.firstName, msg.sentBy.lastName)}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(msg.sentAt), "MMM d, yyyy h:mm a")}</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{msg.message}</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Your Reply</CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isDraftingReply || replyForm.formState.isSubmitting}
                            onClick={handleDraftAiReply}
                            className="h-8 gap-1.5 rounded-full text-xs font-medium border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary transition-all active:scale-95"
                            title="Generate a polite, contextual draft reply with AI"
                        >
                            {isDraftingReply ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Drafting...</span>
                                </>
                            ) : (
                                <>
                                    <Icons.Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span>Draft AI Reply</span>
                                </>
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Form {...replyForm}>
                            <form onSubmit={replyForm.handleSubmit((values) => handleReplySubmit(values, false))} className="space-y-4">
                                <FormField control={replyForm.control} name="message" render={({ field }) => (
                                    <FormItem>
                                        <FormControl><Textarea rows={6} placeholder="Type your response here..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="flex justify-end">
                                     <DropdownMenu>
                                        <div className="inline-flex items-center rounded-md">
                                            <Button type="submit" disabled={replyForm.formState.isSubmitting} className="rounded-r-none">
                                                {replyForm.formState.isSubmitting ? "Sending..." : "Send Reply"}
                                            </Button>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="default" size="icon" className="w-8 rounded-l-none border-l">
                                                    <ChevronDown className="h-4 w-4"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </div>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={replyForm.handleSubmit((values) => handleReplySubmit(values, true))}>
                                                Send Reply & Email
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                             <Select value={ticket.status} onValueChange={(value) => handleStatusChange(value as SupportTicket['status'])}>
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Category</span>
                            <Badge variant="secondary" className="capitalize">{ticket.category}</Badge>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium">{format(new Date(ticket.createdAt), 'PPP')}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={user.avatarUrl} alt={getFullName(user.firstName, user.lastName)} />
                                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{getFullName(user.firstName, user.lastName)}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">User Role</span>
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">{user.role}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
