import { useState, useCallback } from 'react';
import { apiGet, apiPatch, ApiError } from '../lib/api';
import { NotificationDTO } from '@shared/dto';

interface UseNotificationsOptions {
  onError?: (error: string) => void;
}

interface UseNotificationsReturn {
  notifications: NotificationDTO[];
  loading: boolean;
  error: string | null;
  fetchNotifications: (category?: string, status?: 'unread' | 'read' | 'archived') => Promise<void>;
  markAsRead: (recipientId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsUnread: (recipientId: number) => Promise<void>;
  archiveSingle: (recipientId: number) => Promise<void>;
  archiveAll: () => Promise<void>;
  unarchiveSingle: (recipientId: number) => Promise<void>;
  unarchiveAll: () => Promise<void>;
  refetch: () => Promise<void>;
  acknowledgeTimeOff: (timeOffId: number, recipientId: number) => Promise<void>;
  declineTimeOff: (timeOffId: number, recipientId: number) => Promise<void>;
}

export function useNotifications(options?: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [activeStatus, setActiveStatus] = useState<'unread' | 'read' | 'archived' | undefined>(undefined);

  const fetchNotifications = useCallback(async (category?: string, status?: 'unread' | 'read' | 'archived') => {
    try {
      setLoading(true);
      setError(null);
      setActiveCategory(category);
      setActiveStatus(status);

      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (status) params.set('status', status);

      const query = params.toString();
      const endpoint = `/api/notifications${query ? `?${query}` : ''}`;

      const data = await apiGet<NotificationDTO[]>(endpoint);
      setNotifications(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load notifications';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const refetch = useCallback(async () => {
    await fetchNotifications(activeCategory, activeStatus);
  }, [fetchNotifications, activeCategory, activeStatus]);

  const markAsRead = useCallback(async (recipientId: number) => {
    try {
      await apiPatch<void, Record<string, never>>(`/api/notifications/${recipientId}/read`, {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark as read';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiPatch<void, Record<string, never>>('/api/notifications/read-all', {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark all as read';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const archiveSingle = useCallback(async (recipientId: number) => {
    try {
      await apiPatch<void, Record<string, never>>(`/api/notifications/${recipientId}/archive`, {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to archive notification';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const archiveAll = useCallback(async () => {
    try {
      await apiPatch<void, Record<string, never>>('/api/notifications/archive-all', {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to archive all';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const markAsUnread = useCallback(async (recipientId: number) => {
    try {
      await apiPatch<void, Record<string, never>>(`/api/notifications/${recipientId}/unread`, {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark as unread';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const unarchiveSingle = useCallback(async (recipientId: number) => {
    try {
      await apiPatch<void, Record<string, never>>(`/api/notifications/${recipientId}/unarchive`, {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to unarchive notification';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const unarchiveAll = useCallback(async () => {
    try {
      await apiPatch<void, Record<string, never>>('/api/notifications/unarchive-all', {});
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to unarchive all';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const acknowledgeTimeOff = useCallback(async (timeOffId: number, recipientId: number) => {
    try {
      await apiPatch<void, { recipientId: number }>(`/api/time-offs/my-requests/${timeOffId}/acknowledge`, { recipientId });
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to acknowledge time-off';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  const declineTimeOff = useCallback(async (timeOffId: number, recipientId: number) => {
    try {
      await apiPatch<void, { recipientId: number }>(`/api/time-offs/my-requests/${timeOffId}/decline`, { recipientId });
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to decline time-off';
      options?.onError?.(message);
    }
  }, [refetch, options]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    archiveSingle,
    archiveAll,
    unarchiveSingle,
    unarchiveAll,
    refetch,
    acknowledgeTimeOff,
    declineTimeOff,
  };
}
