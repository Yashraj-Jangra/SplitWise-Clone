
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

const broadcastSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  message: z.string().min(10, "Message must be at least 10 characters.").max(500),
  type: z.enum(['announcement', 'critical_alert'], { required_error: 'Please select a type.' }),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export default function BroadcastPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'announcement',
    },
  });

  async function onSubmit(values: BroadcastFormValues) {
    if (!userProfile) {
      toast({ variant: 'destructive', title: 'Not Logged In' });
      return;
    }
    
    const notificationsCollection = collection(db, 'notifications');
    const newNotification = {
      ...values,
      createdAt: Timestamp.now(),
      target: 'all_users',
      readBy: [],
    };

    try {
      await addDoc(notificationsCollection, newNotification);
      toast({
        title: 'Broadcast Sent',
        description: 'Your announcement has been sent to all users.',
      });
      form.reset();
    } catch (error) {
       const permissionError = new FirestorePermissionError({
            path: notificationsCollection.path,
            operation: 'create',
            requestResourceData: newNotification,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Broadcasts</h1>
          <p className="text-muted-foreground">Send notifications to all users of the application.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/broadcasts/history">
            <Icons.History className="mr-2" /> View History
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Broadcast</CardTitle>
          <CardDescription>This message will appear in every user's notification panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Scheduled Maintenance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="announcement">
                            <div className="flex items-center gap-2">
                              <Icons.Announcement /> Announcement
                            </div>
                          </SelectItem>
                          <SelectItem value="critical_alert">
                             <div className="flex items-center gap-2">
                              <Icons.ShieldCheck /> Critical Alert
                            </div>
                          </SelectItem>
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
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide details about the announcement..."
                        rows={6}
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
                  Send Broadcast
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
