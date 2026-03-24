
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings, NotificationCategory } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

const notificationSettingsSchema = z.object({
    new_expense: z.boolean().default(true),
    expense_updated: z.boolean().default(true),
    new_settlement: z.boolean().default(true),
    member_added: z.boolean().default(true),
    debt_reminder: z.boolean().default(true),
});
type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

const notificationCategories: { id: NotificationCategory; label: string; description: string }[] = [
  { id: 'new_expense', label: 'New Expenses', description: 'Get notified when an expense is added to your groups.' },
  { id: 'expense_updated', label: 'Expense Updates', description: 'Receive alerts when an expense you are part of is edited.' },
  { id: 'new_settlement', label: 'New Settlements', description: 'Get notified when a settlement involving you is recorded.' },
  { id: 'member_added', label: 'Group Invitations', description: 'Receive an alert when you are added to a new group.' },
  { id: 'debt_reminder', label: 'Debt Reminders', description: 'Get periodic reminders for your outstanding debts.' },
];

export default function AdminNotificationSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
        new_expense: true,
        expense_updated: true,
        new_settlement: true,
        member_added: true,
        debt_reminder: true,
    }
  });

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);
        if (siteSettings.defaultNotificationSettings) {
            form.reset(siteSettings.defaultNotificationSettings);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load site settings.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast, form]);

  const handleSaveChanges = async (values: NotificationSettingsFormValues) => {
    setIsSaving(true);
    try {
      await updateSiteSettings({ defaultNotificationSettings: values });
      toast({
        title: 'Settings Saved',
        description: 'Default notification settings have been updated for all new users.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderContent = () => {
    if (loading || !settings) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Default Notification Settings</CardTitle>
                        <CardDescription>
                            Configure the default notification preferences for all new users who sign up. 
                            Users can override these settings later in their own profile.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {notificationCategories.map((cat) => (
                          <FormField
                              key={cat.id}
                              control={form.control}
                              name={cat.id}
                              render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                      <div className="space-y-0.5">
                                          <FormLabel className="text-base">{cat.label}</FormLabel>
                                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                                      </div>
                                      <FormControl>
                                          <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                          />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                      ))}
                    </CardContent>
                     <CardFooter className="flex justify-end">
                        <Button type="submit" disabled={isSaving || loading || !settings} size="lg">
                            {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
  }

  return renderContent();
}
