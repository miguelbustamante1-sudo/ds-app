import { useState, useCallback } from 'react';
import { apiPost } from '@/lib/api';
import type { HolidaySwapDTO, CreateHolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface UseCreateSwapOptions {
  onSuccess?: (swap: HolidaySwapDTO) => void;
  onError?: (message: string) => void;
}

export function useCreateSwap(options: UseCreateSwapOptions = {}) {
  const [loading, setLoading] = useState(false);

  const createSwap = useCallback(
    async (input: CreateHolidaySwapDTO) => {
      setLoading(true);
      try {
        const swap = await apiPost<HolidaySwapDTO, CreateHolidaySwapDTO>(
          '/api/holiday-swaps/my',
          input
        );
        options.onSuccess?.(swap);
        return swap;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create holiday swap';
        options.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { createSwap, loading };
}
