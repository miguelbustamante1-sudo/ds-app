import { useState, useCallback } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import type { HolidaySwapDetailDTO, CancelHolidaySwapDTO, ReviewHolidaySwapDTO } from '@shared/dto/HolidaySwap';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';

export interface UseHolidaySwapDetailOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useHolidaySwapDetail(options?: UseHolidaySwapDetailOptions) {
  const [detail, setDetail] = useState<HolidaySwapDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntryDTO[]>([]);

  const loadDetail = useCallback(async (swapId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<HolidaySwapDetailDTO>(`/api/holiday-swaps/${swapId}`);
      setDetail(data);
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

  const loadHistory = useCallback(async (swapId: number): Promise<void> => {
    try {
      const data = await apiGet<AuditHistoryEntryDTO[]>(`/api/holiday-swaps/${swapId}/history`);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }, []);

  const cancelSwap = useCallback(async (swapId: number, comment?: string): Promise<void> => {
    try {
      setLoading(true);
      const body: CancelHolidaySwapDTO = { comment };
      await apiPatch<void, CancelHolidaySwapDTO>(`/api/holiday-swaps/my/${swapId}/cancel`, body);
      options?.onSuccess?.('Holiday swap cancelled successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel holiday swap';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reviewSwap = useCallback(async (swapId: number, statusId: number, comment?: string): Promise<void> => {
    try {
      setLoading(true);
      const body: ReviewHolidaySwapDTO = { statusId, comment };
      await apiPatch<void, ReviewHolidaySwapDTO>(`/api/holiday-swaps/${swapId}/review`, body);
      const action = statusId === 2 ? 'approved' : 'rejected';
      options?.onSuccess?.(`Holiday swap ${action} successfully`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to review holiday swap';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { detail, loading, error, loadDetail, loadHistory, history, cancelSwap, reviewSwap };
}
