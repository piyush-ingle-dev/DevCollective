import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { NotificationItem } from '../types';

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<{ likedByMe: boolean; likes: number }>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, getToken } = useClerkAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const serviceFetch = useCallback(async (init: RequestInit = {}, query = '?mode=list') => {
    const baseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('Supabase URL is not configured.');
    const token = await getToken();
    if (!token) throw new Error('Not authenticated.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}/functions/v1/community-notifications${query}`, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Notification request failed.');
    return data;
  }, [getToken]);

  const refreshNotifications = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const data = await serviceFetch();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (error) {
      console.error('Could not load notifications:', error);
    }
  }, [isSignedIn, serviceFetch]);

  useEffect(() => {
    if (!isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void refreshNotifications();
    pollingRef.current = window.setInterval(() => void refreshNotifications(), 10000);
    return () => {
      if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
    };
  }, [isSignedIn, refreshNotifications]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setNotifications((previous) => previous.map((item) => ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - ids.filter((id) => notifications.some((item) => item.id === id && !item.readAt)).length));
    try {
      await serviceFetch({ method: 'POST', body: JSON.stringify({ action: 'mark-read', ids }) });
    } catch (error) {
      console.error('Could not mark notifications as read:', error);
      void refreshNotifications();
    }
  }, [notifications, refreshNotifications, serviceFetch]);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.readAt).map((item) => item.id);
    if (!unreadIds.length) return;
    await markRead(unreadIds);
  }, [markRead, notifications]);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    const data = await serviceFetch({ method: 'POST', body: JSON.stringify({ action: 'toggle-comment-like', commentId }) });
    void refreshNotifications();
    return { likedByMe: Boolean(data.likedByMe), likes: Number(data.likes) || 0 };
  }, [refreshNotifications, serviceFetch]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, panelOpen, setPanelOpen, refreshNotifications, markAllRead, markRead, toggleCommentLike }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
