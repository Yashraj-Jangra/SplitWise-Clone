
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification } from '@/types';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

// NotificationItem component: Simplified and visually improved.
function NotificationItem({ notification }: { notification: Notification; }) {
  const Icon = notification.type === 'critical_alert' ? Icons.ShieldCheck : Icons.Announcement;
  const iconColor = notification.type === 'critical_alert' ? 'text-destructive' : 'text-primary';

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 border-b last:border-b-0 transition-colors",
      !notification.isRead && "bg-primary/5"
    )}>
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-1", iconColor)} />
      <div className="flex-1">
        <p className="font-semibold">{notification.title}</p>
        {/* Added whitespace-pre-wrap to fix text wrapping */}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userProfile) return;

    const q = query(
        collection(db, 'notifications'), 
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedNotifications: Notification[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                isRead: data.readBy?.includes(userProfile.uid) || false,
            } as Notification;
        });
        
        setNotifications(fetchedNotifications);
        const newUnreadCount = fetchedNotifications.filter(n => !n.isRead).length;
        setUnreadCount(newUnreadCount);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [userProfile]);

  // New function to mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!userProfile || unreadCount === 0) return;
    
    setIsMarkingRead(true);
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const batch = writeBatch(db);

    unreadNotifications.forEach(notif => {
        const notifDocRef = doc(db, 'notifications', notif.id);
        batch.update(notifDocRef, {
            readBy: arrayUnion(userProfile.uid),
        });
    });

    try {
        await batch.commit();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not mark notifications as read."
        });
        console.error("Error marking all notifications as read:", error);
    } finally {
        setIsMarkingRead(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-muted">
          <Icons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      {/* Made wider and adjusted styling */}
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
                <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={isMarkingRead} className="p-0 h-auto">
                    {isMarkingRead ? "Updating..." : "Mark all as read"}
                </Button>
            )}
        </div>
        <ScrollArea className="h-96">
            {notifications.length > 0 ? (
                <div>
                    {notifications.map(notif => (
                        <NotificationItem key={notif.id} notification={notif} />
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <Icons.Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No new notifications.</p>
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
