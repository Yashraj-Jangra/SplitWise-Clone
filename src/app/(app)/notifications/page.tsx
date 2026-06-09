'use client';

import { useNotifications } from '@/contexts/notification-context';
import { NotificationItem } from '@/components/shared/notification-item';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const { notifications, loading, markAllRead, markRead } = useNotifications();

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (!isRead) {
        await markRead(id);
    }
  };

  if (loading) {
      return (
          <div className="max-w-4xl mx-auto space-y-6">
              <Skeleton className="h-10 w-48" />
              <Card>
                  <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                  <CardContent className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                  </CardContent>
              </Card>
          </div>
      );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const expensesNotifs = notifications.filter(n => n.type.includes('expense'));
  const settlementsNotifs = notifications.filter(n => n.type.includes('settlement'));
  const otherNotifs = notifications.filter(n => !n.type.includes('expense') && !n.type.includes('settlement'));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with activity in your groups.</p>
        </div>
        {unreadCount > 0 && (
            <Button onClick={markAllRead} variant="outline">
                <Icons.Check className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
            <Card>
                <CardContent className="p-0">
                    {notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} onClick={() => handleNotificationClick(notif.id, notif.isRead)} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="expenses">
            <Card>
                <CardContent className="p-0">
                    {expensesNotifs.length > 0 ? (
                        <div className="divide-y">
                            {expensesNotifs.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} onClick={() => handleNotificationClick(notif.id, notif.isRead)} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No expense notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settlements">
            <Card>
                <CardContent className="p-0">
                    {settlementsNotifs.length > 0 ? (
                        <div className="divide-y">
                            {settlementsNotifs.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} onClick={() => handleNotificationClick(notif.id, notif.isRead)} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No settlement notifications yet." />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="other">
             <Card>
                <CardContent className="p-0">
                    {otherNotifs.length > 0 ? (
                        <div className="divide-y">
                            {otherNotifs.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} onClick={() => handleNotificationClick(notif.id, notif.isRead)} />
                            ))}
                        </div>
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
        <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Icons.Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{message}</h3>
            <p className="text-muted-foreground mt-1 text-sm">No notifications to show here right now.</p>
        </div>
    );
}
