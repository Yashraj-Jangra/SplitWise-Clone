'use client';

import { useState } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from '@/components/shared/notification-item';
import Link from 'next/link';

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    await markAllRead();
    setIsMarkingRead(false);
  };

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (!isRead) {
        await markRead(id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-muted">
          <Icons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
                <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={isMarkingRead} className="p-0 h-auto">
                    {isMarkingRead ? "Updating..." : "Mark all as read"}
                </Button>
            )}
        </div>
        <ScrollArea className="h-[400px]">
            {notifications.length > 0 ? (
                <div>
                    {notifications.slice(0, 20).map(notif => (
                        <NotificationItem 
                            key={notif.id} 
                            notification={notif} 
                            onClick={() => handleNotificationClick(notif.id, notif.isRead)} 
                        />
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                    <Icons.Bell className="h-8 w-8 mb-4 text-muted-foreground/30" />
                    <p>No new notifications.</p>
                </div>
            )}
        </ScrollArea>
        <div className="border-t p-2">
            <Button asChild variant="ghost" className="w-full justify-center text-sm" onClick={() => setOpen(false)}>
                <Link href="/notifications">View all notifications</Link>
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
