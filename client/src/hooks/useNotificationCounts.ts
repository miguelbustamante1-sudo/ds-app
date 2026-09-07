import { useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import type { NotificationCountsDTO } from '@shared/dto';

interface UseNotificationCountsReturn {
  counts: NotificationCountsDTO;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useNotificationCounts(): UseNotificationCountsReturn {
  const [counts, setCounts] = useState<NotificationCountsDTO>({ unread: 0, read: 0, archived: 0 });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<NotificationCountsDTO>('/api/notifications/counts');
      setCounts(data);
    } catch (err) {
      // Silently fail for counts — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  return { counts, loading, refetch };
}
