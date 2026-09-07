import { useState, useEffect, useCallback } from 'react';
import type {
  TimeOffActivityLogEntryDTO,
  TimeOffActivityLogResponseDTO,
} from '@shared/dto/TimeOffActivityLog';

export type ActivityScope = 'mine' | 'team';

export function useTimeOffActivity(scope: ActivityScope) {
  const [data, setData]       = useState<TimeOffActivityLogEntryDTO[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [pageSize]            = useState(25);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope,
        page:     String(page),
        pageSize: String(pageSize),
      });
      const res  = await fetch(`/api/time-offs/activity-log?${params}`);
      const json = (await res.json()) as TimeOffActivityLogResponseDTO;
      setData(json.data);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, [scope, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 0 whenever scope changes
  useEffect(() => { setPage(0); }, [scope]);

  return { data, total, page, setPage, pageSize, loading };
}
