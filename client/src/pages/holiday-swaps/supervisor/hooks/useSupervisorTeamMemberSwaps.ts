import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function useSupervisorTeamMemberSwaps() {
  const [swaps, setSwaps] = useState<HolidaySwapDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSwaps = useCallback(async (teamMemberId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<HolidaySwapDTO[]>(`/api/holiday-swaps/team/${teamMemberId}`);
      setSwaps(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load swaps');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSwaps = useCallback(() => {
    setSwaps([]);
    setError(null);
  }, []);

  return { swaps, loading, error, loadSwaps, clearSwaps };
}
