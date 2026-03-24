
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserNotificationDocument, NotificationDocument, NotificationCategory } from '@/types';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

// Unified type for display
interface DisplayNotification {
  id: string;
  isRead: boolean;
  title: string;
  message: string;
  createdAt: string;
  link?: string;
  icon: React.ReactNode;
  iconColor: string;
  isBroadcast: boolean;
}

// NotificationItem component
function NotificationItem({ notification, onNotificationClick }: { notification: DisplayNotification; onNotificationClick: (notif: DisplayNotification) => void; }) {
  const { icon, iconColor, title, message, createdAt, isRead, link } = notification;

  return (
    <div
      onClick={() => onNotificationClick(notification)}
      className={cn(
        "flex items-start gap-4 p-4 border-b last:border-b-0 transition-colors",
        !isRead && "bg-primary/5",
        link && "hover:bg-muted cursor-pointer"
      )}
    >
      <div className={cn("h-5 w-5 flex-shrink-0 mt-1", iconColor)}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}


export function NotificationBell() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const { toast } = useToast();
  
  // State for browser notification permissions
  const [permission, setPermission] = useState('default');
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(window.Notification.permission);
    }
  }, [open]);

  useEffect(() => {
    if (!userProfile) return;

    let broadcastNotifs: DisplayNotification[] = [];
    let personalNotifs: DisplayNotification[] = [];

    const updateCombinedState = () => {
      const combined = [...broadcastNotifs, ...personalNotifs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 30); // Display up to 30 notifications total

      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.isRead).length);
    };

    // Listener for Admin Broadcasts
    const broadcastQuery = query(
        collection(db, 'notifications'), 
        orderBy('createdAt', 'desc'),
        limit(20)
    );
    const unsubBroadcasts = onSnapshot(broadcastQuery, 
      (snapshot) => {
        broadcastNotifs = snapshot.docs.map(doc => {
            const data = doc.data() as NotificationDocument;
            return {
                id: doc.id,
                isRead: data.readBy?.includes(userProfile.uid) || false,
                title: data.title,
                message: data.message,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                icon: data.type === 'critical_alert' ? <Icons.ShieldCheck /> : <Icons.Announcement />,
                iconColor: data.type === 'critical_alert' ? 'text-destructive' : 'text-primary',
                isBroadcast: true,
                link: undefined,
            };
        });
        updateCombinedState();
      },
      (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'notifications', operation: 'list' }));
        console.error("Error fetching admin notifications:", error);
      }
    );

    // Listener for Personal Notifications
    const personalQuery = query(
        collection(db, 'userNotifications'),
        where('userId', '==', userProfile.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
    );
    const unsubPersonal = onSnapshot(personalQuery, 
      (snapshot) => {
        const iconMap: Record<NotificationCategory, React.ReactNode> = {
            new_expense: <Icons.Expense />,
            expense_updated: <Icons.Edit />,
            new_settlement: <Icons.Settle />,
            member_added: <Icons.UserPlus />,
            debt_reminder: <Icons.BellRing />
        };
        personalNotifs = snapshot.docs.map(doc => {
            const data = doc.data() as UserNotificationDocument;
            return {
                id: doc.id,
                isRead: data.isRead,
                title: data.title,
                message: data.body,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                link: data.link,
                icon: iconMap[data.type] || <Icons.Bell />,
                iconColor: 'text-primary',
                isBroadcast: false
            };
        });
        updateCombinedState();
      },
      (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `userNotifications where userId == ${userProfile.uid}`, operation: 'list' }));
        console.error("Error fetching personal notifications:", error);
      }
    );

    return () => {
        unsubBroadcasts();
        unsubPersonal();
    };
  }, [userProfile]);
  
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
        toast({ title: 'Unsupported Browser', description: 'This browser does not support desktop notifications.', variant: 'destructive'});
        return;
    }
    const newPermission = await Notification.requestPermission();
    setPermission(newPermission);
    if (newPermission === 'granted') {
        toast({ title: 'Notifications Enabled', description: 'You will now receive browser notifications.' });
        // Later: Here we would subscribe the user to a push service (e.g., FCM)
    } else {
        toast({ title: 'Notifications Blocked', description: 'To enable notifications, please go to your browser settings.', variant: 'destructive' });
    }
  };


  const handleNotificationClick = (notif: DisplayNotification) => {
    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userProfile || unreadCount === 0) return;
    
    setIsMarkingRead(true);
    const unreadNotifs = notifications.filter(n => !n.isRead);
    const batch = writeBatch(db);

    unreadNotifs.forEach(notif => {
      if (notif.isBroadcast) {
        const notifDocRef = doc(db, 'notifications', notif.id);
        batch.update(notifDocRef, {
          readBy: arrayUnion(userProfile.uid),
        });
      } else {
        const notifDocRef = doc(db, 'userNotifications', notif.id);
        batch.update(notifDocRef, {
          isRead: true,
        });
      }
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
                <NotificationItem key={notif.id} notification={notif} onNotificationClick={handleNotificationClick} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Icons.Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No new notifications.</p>
            </div>
          )}
        </ScrollArea>
        {permission === 'default' && (
          <div className="p-4 border-t bg-muted/50 text-center">
            <p className="text-sm font-medium">Get alerts on your device?</p>
            <p className="text-xs text-muted-foreground mb-3">Enable browser notifications for real-time updates.</p>
            <Button size="sm" className="w-full" onClick={handleRequestPermission}>Enable Notifications</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
