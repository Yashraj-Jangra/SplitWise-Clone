

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials, getFullName, cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

import type { SupportTicket } from '@/types';
import { addDoc, collection, Timestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTicketsByUserId } from '@/lib/mock-data';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters long.").max(100),
  category: z.enum(['bug', 'feature', 'billing', 'general'], { required_error: 'Please select a category.' }),
  message: z.string().min(20, "Message must be at least 20 characters long.").max(2000),
});

type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;

const replySchema = z.object({
  replyMessage: z.string().min(1, "Reply cannot be empty.").max(2000),
});
type ReplyFormValues = z.infer<typeof replySchema>;


const statusStyles: { [key: string]: string } = {
  open: 'bg-green-500/20 text-green-400 border-green-500/50',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  closed: 'bg-red-500/20 text-red-400 border-red-500/50',
};


function TicketHistory() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isReplying, setIsReplying] = useState<string | null>(null);

  const replyForm = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { replyMessage: '' },
  });

  useEffect(() => {
    async function loadTickets() {
      if (!userProfile) return;
      setLoading(true);
      const userTickets = await getTicketsByUserId(userProfile.uid);
      setAllTickets(userTickets);
      setLoading(false);
    }
    if (userProfile) {
      loadTickets();
    }
  }, [userProfile]);

  const handleReplySubmit = async (ticketId: string, values: ReplyFormValues) => {
    if (!userProfile) return;
    setIsReplying(ticketId);

    const ticketDocRef = doc(db, 'tickets', ticketId);
    const newMessage = {
        sentAt: Timestamp.now(),
        sentById: userProfile.uid,
        message: values.replyMessage,
    };
    
    updateDoc(ticketDocRef, {
        messages: arrayUnion(newMessage),
        updatedAt: Timestamp.now(),
        status: 'in-progress'
    })
    .then(async () => {
        toast({ title: 'Reply Sent' });
        replyForm.reset();
        
        // Fetch updated tickets to show new message immediately
        const updatedTickets = await getTicketsByUserId(userProfile.uid);
        setAllTickets(updatedTickets);

        // Trigger email notification
        try {
            await fetch('/api/admin/notify-ticket-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: ticketId, replyMessage: values.replyMessage, replierId: userProfile.uid }),
            });
        } catch (emailError) {
            console.error("Failed to trigger reply notification email:", emailError);
        }
    })
    .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: ticketDocRef.path,
            operation: 'update',
            requestResourceData: { messages: arrayUnion(newMessage) },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
        setIsReplying(null);
    });
  }

  if (loading || authLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Your Tickets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const visibleTickets = showAll ? allTickets : allTickets.slice(0, 5);

  if (allTickets.length === 0) {
    return (
       <Card className="text-center py-12 border-dashed">
          <CardHeader className="p-0">
              <div className="flex justify-center mb-4">
                  <Icons.Help className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle>No Tickets Found</CardTitle>
              <CardDescription>
                  Your submitted support tickets will appear here.
              </CardDescription>
          </CardHeader>
       </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Tickets</CardTitle>
        <CardDescription>A history of your communication with our support team.</CardDescription>
      </CardHeader>
      <CardContent>
         <Accordion type="single" collapsible className="w-full">
           {visibleTickets.map(ticket => (
              <AccordionItem value={ticket.id} key={ticket.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="text-left">
                      <p className="font-semibold">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">#{ticket.id.slice(0, 8)} • Last updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", statusStyles[ticket.status])}>{ticket.status.replace('-', ' ')}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
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
                    {ticket.status !== 'closed' && (
                        <div className="pt-4 border-t">
                            <Form {...replyForm}>
                                <form onSubmit={replyForm.handleSubmit((values) => handleReplySubmit(ticket.id, values))} className="space-y-3">
                                    <FormField
                                        control={replyForm.control}
                                        name="replyMessage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="sr-only">Your Reply</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Type your reply..." {...field} rows={4} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isReplying === ticket.id}>
                                            {isReplying === ticket.id && <Icons.AppLogo className="mr-2 animate-spin" />}
                                            Send Reply
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
           ))}
         </Accordion>
         {allTickets.length > 5 && !showAll && (
            <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                    Show All {allTickets.length} Tickets
                </Button>
            </div>
         )}
      </CardContent>
    </Card>
  )
}

export default function SupportPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: '',
      category: 'general',
      message: '',
    },
  });

  async function onSubmit(values: SupportTicketFormValues) {
    if (!userProfile) {
      toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to submit a ticket.' });
      return;
    }

    const ticketsCollection = collection(db, 'tickets');

    const newTicketData = {
      userId: userProfile.uid,
      userName: `${userProfile.firstName} ${userProfile.lastName || ''}`.trim(),
      userEmail: userProfile.email,
      subject: values.subject,
      category: values.category,
      status: 'open' as 'open' | 'in-progress' | 'closed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messages: [
        {
          sentAt: Timestamp.now(),
          sentById: userProfile.uid,
          message: values.message,
        },
      ],
    };

    addDoc(ticketsCollection, newTicketData)
      .then(async (docRef) => {
        toast({
          title: 'Support Ticket Submitted',
          description: `Your ticket (ID: ${docRef.id.slice(0, 8)}) has been received.`,
        });
        
        form.reset();

        // Trigger admin email notification
        try {
          await fetch('/api/admin/notify-new-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: docRef.id })
          });
        } catch(e) {
          console.error("Failed to trigger admin notification but ticket was created.", e);
        }

        router.refresh();
      })
      .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: ticketsCollection.path,
            operation: 'create',
            requestResourceData: newTicketData,
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);
      });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Help & Support</h1>
        <p className="text-muted-foreground">Track your support requests or submit a new one.</p>
      </div>

      <TicketHistory />

      <Card>
        <CardHeader>
          <CardTitle>Submit a New Ticket</CardTitle>
          <CardDescription>Our team will get back to you via email as soon as possible.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Issue with expense splitting" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General Question</SelectItem>
                          <SelectItem value="bug">Report a Bug</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="billing">Billing Issue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide as much detail as possible..."
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Icons.AppLogo className="mr-2 animate-spin" />}
                  Submit Ticket
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
