
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { SupportTicketDocument } from '@/types';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters long.").max(100),
  category: z.enum(['bug', 'feature', 'billing', 'general'], { required_error: 'Please select a category.' }),
  message: z.string().min(20, "Message must be at least 20 characters long.").max(2000),
});

type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;

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

    const newTicket: Omit<SupportTicketDocument, 'messages'> & { messages: any[] } = {
      userId: userProfile.uid,
      userName: `${userProfile.firstName} ${userProfile.lastName || ''}`.trim(),
      userEmail: userProfile.email,
      subject: values.subject,
      category: values.category,
      status: 'open',
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

    addDoc(ticketsCollection, newTicket)
      .then((docRef) => {
        toast({
          title: 'Support Ticket Submitted',
          description: `Your ticket (ID: ${docRef.id.slice(0, 8)}) has been received. We'll get back to you via email.`,
        });
        form.reset();

        // Trigger admin notification email
        fetch('/api/admin/notify-new-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: docRef.id }),
        });

      })
      .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: ticketsCollection.path,
            operation: 'create',
            requestResourceData: newTicket,
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);

          toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Could not submit your support ticket due to a permission error.',
          });
      });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Help & Support</h1>
        <p className="text-muted-foreground">Have a question or need assistance? Let us know.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Support Ticket</CardTitle>
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
