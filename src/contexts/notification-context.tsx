"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { NotificationV2, NotificationV2Document } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { hydrateUsers } from '@/lib/mock-data';

interface NotificationContextType {
  notifications: NotificationV2[];
  unreadCount: number;
  loading: boolean;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationV2[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userProfile) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // We only fetch notifications targeted at this user or 'all_users'
    // Usually 'all_users' are duplicated by adding everyone to recipientIds, or the client handles it.
    // For simplicity and scale, recipientIds will contain all target userIds.
    const q = query(
      collection(db, 'notifications_v2'),
      where('recipientIds', 'array-contains', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        const fetchedDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data() as NotificationV2Document,
        }));
        
        // Hydrate actors
        const actorIds = [...new Set(fetchedDocs.map(d => d.data.actorId).filter(Boolean) as string[])];
        let userMap = new Map();
        if (actorIds.length > 0) {
            const users = await hydrateUsers(actorIds);
            userMap = new Map(users.map(u => [u.uid, u]));
        }

        const hydratedNotifications: NotificationV2[] = fetchedDocs.map(doc => {
            const data = doc.data;
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                isRead: data.readBy?.includes(userProfile.uid) || false,
                actor: data.actorId ? userMap.get(data.actorId) : undefined,
            } as NotificationV2;
        });
        
        setNotifications(hydratedNotifications);
        setUnreadCount(hydratedNotifications.filter(n => !n.isRead).length);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'notifications_v2',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userProfile) return;
    try {
        const notifDocRef = doc(db, 'notifications_v2', notificationId);
        await updateDoc(notifDocRef, {
            readBy: arrayUnion(userProfile.uid),
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
  }, [userProfile]);

  const markAllRead = useCallback(async () => {
    if (!userProfile || unreadCount === 0) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const batch = writeBatch(db);

    unreadNotifications.forEach(notif => {
        const notifDocRef = doc(db, 'notifications_v2', notif.id);
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
    }
  }, [userProfile, unreadCount, notifications, toast]);

  const clearAll = useCallback(async () => {
      // Typically, users only hide them or remove themselves from recipientIds, 
      // but if we do a true delete, they are gone. Let's just remove user from recipientIds
      if (!userProfile) return;
      const batch = writeBatch(db);
      
      notifications.forEach(notif => {
        const notifDocRef = doc(db, 'notifications_v2', notif.id);
        // Instead of removing from recipientIds, we might just not have clearAll, or mark them soft-deleted.
        // For now, let's omit the actual implementation or do a removal from recipientIds.
      });
  }, [userProfile, notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    clearAll,
  }), [notifications, unreadCount, loading, markRead, markAllRead, clearAll]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
