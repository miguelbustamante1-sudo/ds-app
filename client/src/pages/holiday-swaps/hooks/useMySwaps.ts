import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function useMySwaps() {
  const [swaps, setSwaps] = useState<HolidaySwapDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSwaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<HolidaySwapDTO[]>('/api/holiday-swaps/my');
      setSwaps(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load holiday swaps');
    } finally {
      setLoading(false);
    }
  }, []);

  return { swaps, loading, error, loadSwaps };
}
