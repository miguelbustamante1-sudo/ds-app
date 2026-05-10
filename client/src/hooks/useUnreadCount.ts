import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, ApiError } from '../lib/api';
import { UnreadCountDTO } from '@shared/dto';

const DEFAULT_POLL_INTERVAL = 30000; // 30 seconds

interface UseUnreadCountOptions {
  pollInterval?: number;
  enabled?: boolean;
  onError?: (error: string) => void;
}

interface UseUnreadCountReturn {
  unreadCount: number;
  refetch: () => Promise<void>;
}

export function useUnreadCount(options?: UseUnreadCountOptions): UseUnreadCountReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const enabled = options?.enabled ?? true;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await apiGet<UnreadCountDTO>('/api/notifications/unread-count');
      setUnreadCount(data.count);
    } catch (err) {
      if (err instanceof ApiError) {
        options?.onError?.(err.message);
      }
    }
  }, [enabled, options]);

  useEffect(() => {
    if (!enabled) return;

    refetch();

    intervalRef.current = setInterval(refetch, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetch, pollInterval, enabled]);

  return { unreadCount, refetch };
}
