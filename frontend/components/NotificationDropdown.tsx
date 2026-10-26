'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck, Clock, X, MessageCircle, HeartHandshake, Building2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  payload?: any;
  link?: string | null;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  onNotificationClick?: (notification: NotificationItem) => void;
  className?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onNotificationClick,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get<{ count: number; unread_count: number }>('/notifications/unread-count');
      const count = res.data?.unread_count ?? res.data?.count ?? 0;
      setUnreadCount(count);
    } catch {
      // Fallback in case of network issue
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      setNotifications(res.data || []);
      // Recalculate unread count from fetched items
      const unread = (res.data || []).filter((n) => !n.read && !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // Keep existing notifications
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 15s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.read && !item.is_read) {
      try {
        await apiClient.patch(`/notifications/${item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    if (onNotificationClick) {
      onNotificationClick(item);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('mentorship')) {
      return <HeartHandshake size={15} className="text-emerald-700" />;
    }
    if (type.includes('application')) {
      return <Building2 size={15} className="text-sky-700" />;
    }
    if (type.includes('message')) {
      return <MessageCircle size={15} className="text-indigo-700" />;
    }
    if (type.includes('match') || type.includes('feedback')) {
      return <Sparkles size={15} className="text-amber-700" />;
    }
    return <FileText size={15} className="text-slate-600" />;
  };

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-84 sm:w-96 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-forest">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-xs font-semibold text-forest hover:text-ink transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 py-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-60 mb-2" />
                <p className="text-xs font-medium text-slate-600">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No new notifications right now.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read && !item.is_read;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group flex items-start gap-3 p-3 transition cursor-pointer rounded-xl hover:bg-slate-50 ${
                      isUnread ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <span className="mt-0.5 rounded-xl bg-slate-100 p-2 group-hover:bg-white group-hover:shadow-xs transition">
                      {getIcon(item.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${isUnread ? 'font-bold text-ink' : 'font-semibold text-slate-700'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap flex items-center gap-0.5">
                          <Clock size={10} />
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-forest shrink-0" title="Unread" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
