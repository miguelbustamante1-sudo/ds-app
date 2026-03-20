import { useState, useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { HolidaySwapDTO, ReviewHolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface UseReviewSwapOptions {
  onSuccess?: (swap: HolidaySwapDTO) => void;
  onError?: (message: string) => void;
}

export function useReviewSwap(options: UseReviewSwapOptions = {}) {
  const [loading, setLoading] = useState(false);

  const reviewSwap = useCallback(
    async (swapId: number, input: ReviewHolidaySwapDTO) => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, ReviewHolidaySwapDTO>(
          `/api/holiday-swaps/${swapId}/review`,
          input
        );
        options.onSuccess?.(swap);
        return swap;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to review holiday swap';
        options.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { reviewSwap, loading };
}
