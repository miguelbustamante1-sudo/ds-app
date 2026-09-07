import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { TeamMemberTimeOffBreakdownDTO } from '@shared/dto/TimeOff';

interface Options {
  onError?: (message: string) => void;
}

export function useMyTimeOffBreakdown({ onError }: Options = {}) {
  const [breakdown, setBreakdown] = useState<TeamMemberTimeOffBreakdownDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBreakdown = useCallback(async (year?: number) => {
    setLoading(true);
    try {
      const url = year
        ? `/api/time-offs/my-requests/yearly-breakdown?year=${year}`
        : '/api/time-offs/my-requests/yearly-breakdown';
      const data = await apiGet<TeamMemberTimeOffBreakdownDTO>(url);
      setBreakdown(data);
    } catch {
      onError?.('Failed to load time-off breakdown');
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  return { breakdown, loading, loadBreakdown };
}
