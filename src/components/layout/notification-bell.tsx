
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  orderBy,
  limit,
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

function NotificationItem({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: string) => void; }) {
  const Icon = notification.type === 'critical_alert' ? Icons.ShieldCheck : Icons.Announcement;
  const iconColor = notification.type === 'critical_alert' ? 'text-destructive' : 'text-primary';

  return (
    <div className="flex items-start gap-4 p-3 border-b last:border-b-0">
      <Icon className={cn("h-6 w-6 flex-shrink-0 mt-1", iconColor)} />
      <div className="flex-1">
        <p className="font-semibold">{notification.title}</p>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <Button variant="outline" size="sm" onClick={() => onMarkRead(notification.id)} className="h-auto px-2 py-1 text-xs">
          Mark Read
        </Button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    const q = query(
        collection(db, 'notifications'), 
        orderBy('createdAt', 'desc'),
        limit(20) // Limit to the latest 20 notifications
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

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userProfile) return;
    const notifDocRef = doc(db, 'notifications', notificationId);
    try {
        await updateDoc(notifDocRef, {
            readBy: arrayUnion(userProfile.uid),
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        const permissionError = new FirestorePermissionError({
            path: notifDocRef.path,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-muted">
          <Icons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount}
            </div>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-96">
            {notifications.length > 0 ? (
                <div>
                    {notifications.map(notif => (
                        <NotificationItem key={notif.id} notification={notif} onMarkRead={handleMarkAsRead} />
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <p>No new notifications.</p>
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
