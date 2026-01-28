
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
import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
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


const notificationBroadcastSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  message: z.string().min(10, "Message must be at least 10 characters.").max(500),
  type: z.enum(['announcement', 'critical_alert'], { required_error: 'Please select a type.' }),
});
type NotificationBroadcastFormValues = z.infer<typeof notificationBroadcastSchema>;

const emailBroadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
});
type EmailBroadcastFormValues = z.infer<typeof emailBroadcastSchema>;


export default function BroadcastPage() {
  const { userProfile, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isEmailBroadcasting, setIsEmailBroadcasting] = useState(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);

  const notificationForm = useForm<NotificationBroadcastFormValues>({
    resolver: zodResolver(notificationBroadcastSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'announcement',
    },
  });

  const emailForm = useForm<EmailBroadcastFormValues>({
    resolver: zodResolver(emailBroadcastSchema),
    defaultValues: { subject: '', body: '' },
  });


  async function onNotificationSubmit(values: NotificationBroadcastFormValues) {
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
        title: 'In-App Broadcast Sent',
        description: 'Your announcement has been sent to all users.',
      });
      notificationForm.reset();
    } catch (error) {
       const permissionError = new FirestorePermissionError({
            path: notificationsCollection.path,
            operation: 'create',
            requestResourceData: newNotification,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }

  const handleEmailBroadcastSubmit = async (values: EmailBroadcastFormValues) => {
    setShowBroadcastConfirm(false);
    setIsEmailBroadcasting(true);
    if (!firebaseUser) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      setIsEmailBroadcasting(false);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify(values),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send broadcast.");
      }

      toast({
        title: "Email Broadcast Sent",
        description: `Your message has been sent to ${result.sentCount} users.`,
      });
      emailForm.reset();
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Broadcast Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsEmailBroadcasting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Broadcasts</h1>
          <p className="text-muted-foreground">Send notifications and emails to all users of the application.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/broadcasts/history">
            <Icons.History className="mr-2" /> View History
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create an In-App Broadcast</CardTitle>
          <CardDescription>This message will appear in every user's notification panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...notificationForm}>
            <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={notificationForm.control}
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
                  control={notificationForm.control}
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
                control={notificationForm.control}
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
                <Button type="submit" disabled={notificationForm.formState.isSubmitting}>
                  {notificationForm.formState.isSubmitting && <Icons.AppLogo className="mr-2 animate-spin" />}
                  Send In-App Broadcast
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
       <Card>
          <Form {...emailForm}>
              <form onSubmit={(e) => { e.preventDefault(); setShowBroadcastConfirm(true); }}>
                  <CardHeader>
                      <CardTitle>Broadcast Email</CardTitle>
                      <CardDescription>Send a one-time email to all registered users. Use with caution. (Requires custom SMTP to be configured)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                        <FormField
                          control={emailForm.control}
                          name="subject"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Subject</FormLabel>
                                  <FormControl><Input placeholder="Important Site Update" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={emailForm.control}
                          name="body"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Body</FormLabel>
                                  <FormControl><Textarea placeholder="Hello everyone, we are writing to inform you about..." {...field} rows={6} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </CardContent>
                  <CardFooter>
                      <Button type="submit" variant="secondary" disabled={isEmailBroadcasting}>
                          {isEmailBroadcasting && <Icons.AppLogo className="mr-2 animate-spin" />}
                          Send Email to All Users
                      </Button>
                  </CardFooter>
              </form>
          </Form>
      </Card>

      <AlertDialog open={showBroadcastConfirm} onOpenChange={setShowBroadcastConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      You are about to send an email to every single user on this platform. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={emailForm.handleSubmit(handleEmailBroadcastSubmit)} disabled={isEmailBroadcasting} variant="destructive">
                      Confirm and Send
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
