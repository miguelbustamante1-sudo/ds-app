import { useState, useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { HolidaySwapDTO, CancelHolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface UseCancelSwapOptions {
  onSuccess?: (swap: HolidaySwapDTO) => void;
  onError?: (message: string) => void;
}

export function useCancelSwap(options: UseCancelSwapOptions = {}) {
  const [loading, setLoading] = useState(false);

  const cancelSwap = useCallback(
    async (swapId: number, input: CancelHolidaySwapDTO = {}) => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, CancelHolidaySwapDTO>(
          `/api/holiday-swaps/my/${swapId}/cancel`,
          input
        );
        options.onSuccess?.(swap);
        return swap;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to cancel holiday swap';
        options.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { cancelSwap, loading };
}
