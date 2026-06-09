'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { broadcastToAll } from '@/lib/notification-service';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Send } from 'lucide-react';


const broadcastSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  message: z.string().min(10, "Message must be at least 10 characters.").max(500),
  type: z.enum(['broadcast_announcement', 'broadcast_critical'], { required_error: 'Please select a type.' }),
  channels: z.array(z.enum(['in_app', 'push', 'email'])).min(1, 'Select at least one channel'),
});
type BroadcastFormValues = z.infer<typeof broadcastSchema>;


export default function BroadcastPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const broadcastForm = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'broadcast_announcement',
      channels: ['in_app'],
    },
  });


  async function onBroadcastSubmit(values: BroadcastFormValues) {
    if (!userProfile) {
      toast({ variant: 'destructive', title: 'Not Logged In' });
      return;
    }
    
    setIsBroadcasting(true);
    try {
      await broadcastToAll(values.title, values.message, values.type, userProfile.uid, values.channels);
      toast({
        title: 'Broadcast Sent',
        description: 'Your broadcast has been successfully dispatched.',
      });
      broadcastForm.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Broadcast Failed',
        description: 'An error occurred while sending the broadcast.',
      });
    } finally {
      setIsBroadcasting(false);
    }
  }

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
          <CardTitle>Create a Broadcast</CardTitle>
          <CardDescription>Dispatch a message across multiple channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...broadcastForm}>
            <form onSubmit={broadcastForm.handleSubmit(onBroadcastSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={broadcastForm.control}
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
                  control={broadcastForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="broadcast_announcement">Announcement</SelectItem>
                          <SelectItem value="broadcast_critical">Critical Alert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={broadcastForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your announcement here..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="px-0 pt-4 flex justify-end">
                <Button type="submit" disabled={isBroadcasting}>
                  {isBroadcasting ? (
                    <>
                      <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Send Broadcast
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
