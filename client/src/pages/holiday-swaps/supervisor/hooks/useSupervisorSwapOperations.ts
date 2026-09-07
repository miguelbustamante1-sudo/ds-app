import { useState, useCallback } from 'react';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type {
  HolidaySwapDTO,
  CreateHolidaySwapDTO,
  UpdateHolidaySwapDTO,
  CancelHolidaySwapDTO,
  ReviewHolidaySwapDTO,
} from '@shared/dto/HolidaySwap';

interface UseSupervisorSwapOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useSupervisorSwapOperations(options?: UseSupervisorSwapOperationsOptions) {
  const [loading, setLoading] = useState(false);

  const createSwap = useCallback(
    async (teamMemberId: number, input: CreateHolidaySwapDTO): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPost<HolidaySwapDTO, CreateHolidaySwapDTO>(
          `/api/holiday-swaps/team/${teamMemberId}`,
          input
        );
        options?.onSuccess?.('Holiday swap created successfully');
        return swap;
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Failed to create swap';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const updateSwap = useCallback(
    async (swapId: number, input: UpdateHolidaySwapDTO): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, UpdateHolidaySwapDTO>(
          `/api/holiday-swaps/team/${swapId}`,
          input
        );
        options?.onSuccess?.('Holiday swap updated successfully');
        return swap;
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Failed to update swap';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const cancelSwap = useCallback(
    async (swapId: number, input: CancelHolidaySwapDTO = {}): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, CancelHolidaySwapDTO>(
          `/api/holiday-swaps/team/${swapId}/cancel`,
          input
        );
        options?.onSuccess?.('Holiday swap cancelled successfully');
        return swap;
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Failed to cancel swap';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reviewSwap = useCallback(
    async (swapId: number, input: ReviewHolidaySwapDTO): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, ReviewHolidaySwapDTO>(
          `/api/holiday-swaps/${swapId}/review`,
          input
        );
        options?.onSuccess?.('Holiday swap reviewed successfully');
        return swap;
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Failed to review swap';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { loading, createSwap, updateSwap, cancelSwap, reviewSwap };
}
