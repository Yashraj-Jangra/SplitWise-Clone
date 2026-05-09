'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const templateSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

const templatesSchema = z.object({
  expenseAdded: templateSchema,
  settlementAdded: templateSchema,
  memberAdded: templateSchema,
  balanceReminder: templateSchema,
  broadcast: templateSchema,
});
type TemplatesFormValues = z.infer<typeof templatesSchema>;

export default function AdminNotificationSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<TemplatesFormValues>({
    resolver: zodResolver(templatesSchema),
    defaultValues: {
        expenseAdded: { subject: '', body: '' },
        settlementAdded: { subject: '', body: '' },
        memberAdded: { subject: '', body: '' },
        balanceReminder: { subject: '', body: '' },
        broadcast: { subject: '', body: '' },
    }
  });

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);
        if (siteSettings.emailTemplates) {
            form.reset({
                expenseAdded: siteSettings.emailTemplates.expenseAdded || { subject: 'New Expense Added in {groupName}', body: 'Hi {userName},\n\n{actorName} added a new expense "{description}" for {amount} in {groupName}.\n\nLog in to see details.\n\nThanks,\nThe {appName} Team' },
                settlementAdded: siteSettings.emailTemplates.settlementAdded || { subject: 'Payment Received in {groupName}', body: 'Hi {userName},\n\n{actorName} recorded a payment of {amount} to you in {groupName}.\n\nLog in to see details.\n\nThanks,\nThe {appName} Team' },
                memberAdded: siteSettings.emailTemplates.memberAdded || { subject: 'You were added to {groupName}', body: 'Hi {userName},\n\nYou were added to the group "{groupName}" by {actorName}.\n\nLog in to start tracking shared expenses.\n\nThanks,\nThe {appName} Team' },
                balanceReminder: siteSettings.emailTemplates.balanceReminder || { subject: 'Balance Reminder from {appName}', body: 'Hi {userName},\n\nYou have outstanding balances in your groups. Please log in to settle up.\n\nThanks,\nThe {appName} Team' },
                broadcast: siteSettings.emailTemplates.broadcast || { subject: '{broadcastSubject}', body: '{broadcastBody}' },
            });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load site settings.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast, form]);

  const handleSaveChanges = async (values: TemplatesFormValues) => {
    setIsSaving(true);
    try {
      // Need to preserve existing templates for other events
      const existingTemplates = settings?.emailTemplates || {};
      const updatedTemplates = {
          ...existingTemplates,
          ...values
      };
      
      await updateSiteSettings({ emailTemplates: updatedTemplates as any });
      toast({
        title: 'Templates Saved',
        description: 'Email notification templates have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the templates.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading || !settings) {
      return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Notification Templates</h1>
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
          </div>
      )
  }

  const templateSections = [
      { id: 'expenseAdded', label: 'New Expense', description: 'Available variables: {appName}, {userName}, {actorName}, {amount}, {groupName}, {description}' },
      { id: 'settlementAdded', label: 'New Settlement', description: 'Available variables: {appName}, {userName}, {actorName}, {amount}, {groupName}' },
      { id: 'memberAdded', label: 'Group Invitation', description: 'Available variables: {appName}, {userName}, {actorName}, {groupName}' },
      { id: 'balanceReminder', label: 'Debt Reminder', description: 'Available variables: {appName}, {userName}' },
      { id: 'broadcast', label: 'Broadcasts', description: 'Available variables: {appName}, {userName}, {broadcastSubject}, {broadcastBody}' },
  ] as const;

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Notification Templates</h1>
          <p className="text-muted-foreground">Customize the emails sent for various application events.</p>
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)}>
                <Tabs defaultValue="expenseAdded" className="w-full">
                    <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
                        {templateSections.map(section => (
                            <TabsTrigger key={section.id} value={section.id}>{section.label}</TabsTrigger>
                        ))}
                    </TabsList>
                    
                    {templateSections.map(section => (
                        <TabsContent key={section.id} value={section.id}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{section.label} Template</CardTitle>
                                    <CardDescription>{section.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name={`${section.id}.subject`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={`${section.id}.body`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Body</FormLabel>
                                            <FormControl><Textarea {...field} className="min-h-[200px]" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                                <CardFooter className="flex justify-end border-t p-4">
                                    <Button type="submit" disabled={isSaving || loading || !settings}>
                                        {isSaving ? <Icons.AppLogo className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Templates
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </form>
        </Form>
      </div>
  );
}
