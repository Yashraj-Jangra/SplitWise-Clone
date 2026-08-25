'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { requestPushPermission } from '@/lib/push-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Bell, 
  Mail, 
  Smartphone, 
  Save, 
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { NotificationEventType, UserNotificationPrefsDocument } from '@/types';

interface EventConfig {
  key: NotificationEventType;
  label: string;
  description: string;
}

const EVENTS_LIST: EventConfig[] = [
  { key: 'expense_added', label: 'Expense Added', description: 'When someone adds a new expense in a group you are in' },
  { key: 'expense_updated', label: 'Expense Updated', description: 'When an expense detail in your groups is modified' },
  { key: 'expense_deleted', label: 'Expense Deleted', description: 'When an expense is removed from your groups' },
  { key: 'settlement_added', label: 'Settlement Received', description: 'When someone records paying you back' },
  { key: 'member_added', label: 'Member Added', description: 'When you or others are added to a new group' },
  { key: 'member_removed', label: 'Member Removed', description: 'When someone leaves or is removed from a group' },
  { key: 'payment_reminder', label: 'Payment Reminder', description: 'When a member explicitly asks you to settle up' },
  { key: 'balance_reminder', label: 'Balance Reminder', description: 'Periodic reminders of your outstanding balances' },
  { key: 'payment_confirmation_request', label: 'Confirmation Request', description: 'When someone requests confirmation of a settlement' },
  { key: 'monthly_summary', label: 'Monthly Summary Report', description: 'Monthly summaries of your spending statistics' },
  { key: 'budget_alert', label: 'Budget Approaching Limit', description: 'When a group reaches 75% or 90% of its monthly spending target' },
  { key: 'budget_exceeded', label: 'Budget Exceeded', description: 'When group spending surpasses 100% of the monthly budget limit' },
  { key: 'group_inactivity', label: 'Group Inactivity Nudges', description: 'Reminders for groups that have been inactive for a while' },
  { key: 'support_reply', label: 'Support Reply', description: 'When the admin responds to your support tickets' },
  { key: 'broadcast_announcement', label: 'Announcements', description: 'General system announcements and newsletters' },
  { key: 'broadcast_critical', label: 'Critical Alerts', description: 'Important system updates and security alerts' },
];

export default function NotificationSettingsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [browserPushPermission, setBrowserPushPermission] = useState('default');

  const [prefs, setPrefs] = useState<UserNotificationPrefsDocument | null>(null);

  // Initialize and load preferences
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    async function loadPrefs() {
      if (!userProfile?.uid) return;
      try {
        setLoading(true);
        const res = await fetch('/api/notifications/prefs');
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const data = await res.json();
        setPrefs(data);
      } catch (err: any) {
        console.error('Error loading notification preferences:', err);
        toast({
          variant: 'destructive',
          title: 'Error loading settings',
          description: err.message || 'Please refresh the page to try again.'
        });
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, [userProfile?.uid, toast]);

  // Handle master channel toggle
  const handleMasterToggle = (channel: 'inAppEnabled' | 'pushEnabled' | 'emailEnabled') => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      [channel]: !prefs[channel]
    });
    setIsDirty(true);
  };

  // Handle individual cell toggle
  const handleCellToggle = (eventKey: NotificationEventType, channel: 'inApp' | 'push' | 'email') => {
    if (!prefs) return;
    const currentEventPrefs = prefs.events[eventKey] || { inApp: true, push: true, email: true };
    const updatedEvents = {
      ...prefs.events,
      [eventKey]: {
        ...currentEventPrefs,
        [channel]: !currentEventPrefs[channel]
      }
    };
    setPrefs({
      ...prefs,
      events: updatedEvents as any
    });
    setIsDirty(true);
  };

  // Enable Browser Push
  const handleEnableBrowserPush = async () => {
    if (!userProfile?.uid) return;
    const granted = await requestPushPermission(userProfile.uid);
    if (granted) {
      setBrowserPushPermission('granted');
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive device alerts for enabled events.'
      });
    } else {
      setBrowserPushPermission(Notification.permission);
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Please enable notification permissions in your browser settings.'
      });
    }
  };

  // Save to API
  const handleSave = async () => {
    if (!prefs || !userProfile?.uid) return;
    try {
      setSaving(true);
      const res = await fetch('/api/notifications/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      setIsDirty(false);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification channels have been updated successfully.'
      });
    } catch (err: any) {
      console.error('Error saving notification preferences:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'An unknown error occurred.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Card className="border border-border/40">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b pb-5">
        <Button 
          onClick={() => router.push('/notifications')} 
          variant="ghost" 
          size="icon" 
          className="rounded-xl border border-border/40 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">
            Notification Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control how and where you get notified about group updates.
          </p>
        </div>
      </div>

      {/* Browser Push status Alert */}
      {browserPushPermission !== 'granted' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-sm">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Enable Browser Push Notifications</p>
              <p className="text-xs text-amber-600/80 mt-0.5">
                Your browser push notifications are not active on this device. Enable them to get real-time screen alerts.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleEnableBrowserPush} 
            className="rounded-xl text-xs bg-amber-500 text-white hover:bg-amber-600 font-semibold"
          >
            Allow Device Alerts
          </Button>
        </div>
      )}

      {/* Matrix Preferences Card */}
      <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/20 px-6 py-5">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Notification Matrix
            {isDirty && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Unsaved Changes
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure default actions for in-app bell, screen push notifications, and emails.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Master Toggles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 border-b border-border/40 bg-muted/10 p-6 gap-6 md:gap-0">
            {/* In-App Master */}
            <div className="flex items-center justify-between md:px-4 py-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> In-App Center
                </p>
                <p className="text-xs text-muted-foreground">Notification bell panel inside app</p>
              </div>
              <Switch 
                checked={prefs?.inAppEnabled} 
                onCheckedChange={() => handleMasterToggle('inAppEnabled')} 
              />
            </div>

            {/* Push Master */}
            <div className="flex items-center justify-between md:px-6 py-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-500" /> Push Notifications
                </p>
                <p className="text-xs text-muted-foreground">Alerts displayed on your device screens</p>
              </div>
              <Switch 
                checked={prefs?.pushEnabled} 
                onCheckedChange={() => handleMasterToggle('pushEnabled')} 
              />
            </div>

            {/* Email Master */}
            <div className="flex items-center justify-between md:px-6 py-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-500" /> Email Deliveries
                </p>
                <p className="text-xs text-muted-foreground">Alerts sent directly to your registered inbox</p>
              </div>
              <Switch 
                checked={prefs?.emailEnabled} 
                onCheckedChange={() => handleMasterToggle('emailEnabled')} 
              />
            </div>
          </div>

          {/* Matrix Header & Rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/5">
                  <th className="p-4 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/2">Notification Event</th>
                  <th className="p-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/6">In-App</th>
                  <th className="p-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/6">Push</th>
                  <th className="p-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/6">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {EVENTS_LIST.map((event) => {
                  const eventPrefs = prefs?.events?.[event.key] || { inApp: true, push: true, email: true };
                  return (
                    <tr key={event.key} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="text-sm font-semibold text-foreground">{event.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                      </td>
                      <td className="p-4 text-center">
                        <Switch 
                          checked={eventPrefs.inApp} 
                          disabled={!prefs?.inAppEnabled}
                          onCheckedChange={() => handleCellToggle(event.key, 'inApp')} 
                          className="mx-auto"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <Switch 
                          checked={eventPrefs.push} 
                          disabled={!prefs?.pushEnabled}
                          onCheckedChange={() => handleCellToggle(event.key, 'push')} 
                          className="mx-auto"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <Switch 
                          checked={eventPrefs.email} 
                          disabled={!prefs?.emailEnabled}
                          onCheckedChange={() => handleCellToggle(event.key, 'email')} 
                          className="mx-auto"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/30 bg-muted/20 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isDirty ? (
              <span className="text-amber-500 font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Notification changes unsaved.
              </span>
            ) : (
              <span className="text-green-500 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> All settings synced to cloud.
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="rounded-xl gap-2 font-semibold text-xs"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Preference Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
