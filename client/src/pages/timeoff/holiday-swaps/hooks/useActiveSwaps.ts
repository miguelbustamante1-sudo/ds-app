import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';

/**
 * Fetches the caller's acknowledged (active) holiday swaps once on demand.
 * Returns parsed DTO strings as-is — date parsing is handled downstream
 * in applySwapsToHolidays (via parseUTCDateAsLocal).
 */
export function useActiveSwaps() {
  const [activeSwaps, setActiveSwaps] = useState<ActiveSwapSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActiveSwaps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ActiveSwapSummaryDTO[]>('/api/holiday-swaps/my/active-swaps');
      setActiveSwaps(data);
    } catch {
      setActiveSwaps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { activeSwaps, loading, loadActiveSwaps };
}
