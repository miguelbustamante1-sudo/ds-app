// client/src/pages/holiday-swaps/exception/hooks/useExceptionHolidaySwapDetail.ts
import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';

export interface UseExceptionHolidaySwapDetailOptions {
  onError?: (message: string) => void;
}

export function useExceptionHolidaySwapDetail(options?: UseExceptionHolidaySwapDetailOptions) {
  const [detail, setDetail] = useState<HolidaySwapDTO | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const load = useCallback(async (swapId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [detailRes, historyRes] = await Promise.all([
        apiGet<HolidaySwapDTO>(`/api/holiday-swaps/exception/swap/${swapId}`),
        apiGet<AuditHistoryEntryDTO[]>(`/api/holiday-swaps/exception/swap/${swapId}/history`),
      ]);
      setDetail(detailRes);
      setHistory(historyRes);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status);
        options?.onError?.(err.message);
      } else {
        setError(500);
        options?.onError?.('Failed to load holiday swap detail');
      }
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { detail, history, loading, error, load, setDetail };
}
