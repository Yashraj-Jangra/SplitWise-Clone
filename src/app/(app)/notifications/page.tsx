'use client';

import { useNotifications } from '@/contexts/notification-context';
import { NotificationItem } from '@/components/shared/notification-item';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { getNotificationUrl } from '@/lib/notification-utils';
import type { NotificationV2 } from '@/types';

export default function NotificationsPage() {
  const { notifications, loading, markAllRead, markRead } = useNotifications();
  const router = useRouter();

  const handleNotificationClick = async (notif: NotificationV2) => {
    // Mark as read immediately if it's unread
    if (!notif.isRead) {
        await markRead(notif.id);
    }
    
    // Navigate using the notification-utils helper
    const url = getNotificationUrl(notif);
    if (url) {
      router.push(url);
    }
  };

  if (loading) {
      return (
          <div className="w-full space-y-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36" />
              </div>
              <Card>
                  <CardContent className="space-y-4 p-6">
                      <Skeleton className="h-20 w-full rounded-xl" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                  </CardContent>
              </Card>
          </div>
      );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const expensesNotifs = notifications.filter(n => n.type.includes('expense'));
  const settlementsNotifs = notifications.filter(n => n.type.includes('settlement'));
  const remindersNotifs = notifications.filter(n => 
    ['payment_reminder', 'balance_reminder', 'payment_confirmation_request', 'monthly_summary', 'group_inactivity', 'budget_alert', 'budget_exceeded'].includes(n.type)
  );
  const otherNotifs = notifications.filter(n => 
    !n.type.includes('expense') && 
    !n.type.includes('settlement') && 
    !['payment_reminder', 'balance_reminder', 'payment_confirmation_request', 'monthly_summary', 'group_inactivity', 'budget_alert', 'budget_exceeded'].includes(n.type)
  );

  // Calculate tab unread counts
  const unreadExpenses = expensesNotifs.filter(n => !n.isRead).length;
  const unreadSettlements = settlementsNotifs.filter(n => !n.isRead).length;
  const unreadReminders = remindersNotifs.filter(n => !n.isRead).length;
  const unreadOther = otherNotifs.filter(n => !n.isRead).length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold shadow-sm animate-pulse shrink-0">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Stay updated with activity across your shared groups.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => router.push('/notifications/settings')} variant="outline" className="shadow-sm gap-2">
            <Settings className="h-4 w-4" /> Settings
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllRead} variant="outline" className="shadow-sm gap-2 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 transition-all duration-200 animate-fade-in">
              <Icons.Check className="h-4 w-4" /> Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 p-1 bg-muted/60 border rounded-xl w-full sm:w-auto inline-flex justify-start">
            <TabsTrigger value="all" className="rounded-lg gap-2 text-sm">
              All
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">{unreadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg gap-2 text-sm">
              Expenses
              {unreadExpenses > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold">{unreadExpenses}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settlements" className="rounded-lg gap-2 text-sm">
              Payments
              {unreadSettlements > 0 && (
                <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full font-semibold">{unreadSettlements}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="rounded-lg gap-2 text-sm">
              Reminders
              {unreadReminders > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full font-semibold">{unreadReminders}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="other" className="rounded-lg gap-2 text-sm">
              System & Help
              {unreadOther > 0 && (
                <span className="text-[10px] bg-purple-500/20 text-purple-500 px-1.5 py-0.5 rounded-full font-semibold">{unreadOther}</span>
              )}
            </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
            <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0 divide-y divide-border/50">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <NotificationItem 
                              key={notif.id} 
                              notification={notif} 
                              onClick={() => handleNotificationClick(notif)} 
                              onMarkRead={() => markRead(notif.id)}
                            />
                        ))
                    ) : (
                        <EmptyState />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="expenses">
            <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0 divide-y divide-border/50">
                    {expensesNotifs.length > 0 ? (
                        expensesNotifs.map(notif => (
                            <NotificationItem 
                              key={notif.id} 
                              notification={notif} 
                              onClick={() => handleNotificationClick(notif)}
                              onMarkRead={() => markRead(notif.id)}
                            />
                        ))
                    ) : (
                        <EmptyState message="No expense notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settlements">
            <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0 divide-y divide-border/50">
                    {settlementsNotifs.length > 0 ? (
                        settlementsNotifs.map(notif => (
                            <NotificationItem 
                              key={notif.id} 
                              notification={notif} 
                              onClick={() => handleNotificationClick(notif)}
                              onMarkRead={() => markRead(notif.id)}
                            />
                        ))
                    ) : (
                        <EmptyState message="No payment notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="reminders">
            <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0 divide-y divide-border/50">
                    {remindersNotifs.length > 0 ? (
                        remindersNotifs.map(notif => (
                            <NotificationItem 
                              key={notif.id} 
                              notification={notif} 
                              onClick={() => handleNotificationClick(notif)}
                              onMarkRead={() => markRead(notif.id)}
                            />
                        ))
                    ) : (
                        <EmptyState message="No reminder notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="other">
             <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0 divide-y divide-border/50">
                    {otherNotifs.length > 0 ? (
                        otherNotifs.map(notif => (
                            <NotificationItem 
                              key={notif.id} 
                              notification={notif} 
                              onClick={() => handleNotificationClick(notif)}
                              onMarkRead={() => markRead(notif.id)}
                            />
                        ))
                    ) : (
                        <EmptyState message="No other notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message = "You're all caught up!" }: { message?: string }) {
    return (
        <div className="p-16 text-center flex flex-col items-center justify-center bg-card/40">
            <div className="h-16 w-16 bg-muted/60 border rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                <Icons.Bell className="h-8 w-8 text-muted-foreground/80" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{message}</h3>
            <p className="text-muted-foreground mt-1 text-sm max-w-xs mx-auto">No notifications to show here right now.</p>
        </div>
    );
}
