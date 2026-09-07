import { useState, useEffect, useCallback } from 'react';
import type {
  TimeOffActivityLogEntryDTO,
  TimeOffActivityLogResponseDTO,
} from '@shared/dto/TimeOffActivityLog';
import type { ActivityScope } from './useTimeOffActivity';

export function useTimeOffActivityFeed(scope: ActivityScope) {
  const [data, setData]       = useState<TimeOffActivityLogEntryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope, page: '0', pageSize: '10' });
      const res    = await fetch(`/api/time-offs/activity-log?${params}`);
      const json   = (await res.json()) as TimeOffActivityLogResponseDTO;
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading };
}
