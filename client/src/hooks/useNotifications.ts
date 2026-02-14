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
  fetchNotifications: (category?: string) => Promise<void>;
  markAsRead: (recipientId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveSingle: (recipientId: number) => Promise<void>;
  archiveAll: () => Promise<void>;
  refetch: () => Promise<void>;
  acknowledgeTimeOff: (timeOffId: number, recipientId: number) => Promise<void>;
  declineTimeOff: (timeOffId: number, recipientId: number) => Promise<void>;
}

export function useNotifications(options?: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const fetchNotifications = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      setActiveCategory(category);

      const params = new URLSearchParams();
      if (category) params.set('category', category);

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
    await fetchNotifications(activeCategory);
  }, [fetchNotifications, activeCategory]);

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
    archiveSingle,
    archiveAll,
    refetch,
    acknowledgeTimeOff,
    declineTimeOff,
  };
}
