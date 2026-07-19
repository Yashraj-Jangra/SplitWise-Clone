"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { NotificationV2 } from '@/types';
import { useToast } from '@/hooks/use-toast';

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

  const fetchInitialNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: NotificationV2) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Error loading initial notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchInitialNotifications();

    // Setup SSE EventSource connection
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const newNotifs = JSON.parse(event.data) as NotificationV2[];
        if (newNotifs.length > 0) {
          setNotifications(prev => {
            const merged = [...newNotifs, ...prev];
            // Deduplicate
            const unique = merged.filter((item, index, self) => 
              self.findIndex(t => t.id === item.id) === index
            );
            // Cap at 50
            const finalNotifs = unique.slice(0, 50);
            setUnreadCount(finalNotifs.filter(n => !n.isRead).length);
            return finalNotifs;
          });
        }
      } catch (err) {
        console.error("Error parsing notification stream data:", err);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource connection error:", error);
      // Let EventSource auto-retry in the background
    };

    return () => {
      eventSource.close();
    };
  }, [userProfile, fetchInitialNotifications]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userProfile) return;
    try {
      // Optimitic UI update
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to update status on server');
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert optimistic update on failure
      fetchInitialNotifications();
    }
  }, [userProfile, fetchInitialNotifications]);

  const markAllRead = useCallback(async () => {
    if (!userProfile || unreadCount === 0) return;
    
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to mark all read on server');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not mark notifications as read."
      });
      console.error("Error marking all notifications as read:", error);
      fetchInitialNotifications();
    }
  }, [userProfile, unreadCount, toast, fetchInitialNotifications]);

  const clearAll = useCallback(async () => {
      // Simplified clear all for local UI
      setNotifications([]);
      setUnreadCount(0);
  }, []);

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
