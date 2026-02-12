import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, ApiError } from '../lib/api';
import { UnreadCountDTO } from '@shared/dto';

const DEFAULT_POLL_INTERVAL = 30000; // 30 seconds

interface UseUnreadCountOptions {
  pollInterval?: number;
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

  const refetch = useCallback(async () => {
    try {
      const data = await apiGet<UnreadCountDTO>('/api/notifications/unread-count');
      setUnreadCount(data.count);
    } catch (err) {
      if (err instanceof ApiError) {
        options?.onError?.(err.message);
      }
    }
  }, [options]);

  useEffect(() => {
    refetch();

    intervalRef.current = setInterval(refetch, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetch, pollInterval]);

  return { unreadCount, refetch };
}
