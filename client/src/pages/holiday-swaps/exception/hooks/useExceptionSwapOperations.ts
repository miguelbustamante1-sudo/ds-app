import { useState, useCallback } from 'react';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type {
  HolidaySwapDTO,
  UpdateHolidaySwapDTO,
  CancelHolidaySwapDTO,
  ReviewHolidaySwapDTO,
} from '@shared/dto/HolidaySwap';
import type { CreateExceptionHolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface UseExceptionSwapOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useExceptionSwapOperations(options?: UseExceptionSwapOperationsOptions) {
  const [loading, setLoading] = useState(false);

  const createSwap = useCallback(
    async (
      teamMemberId: number,
      input: CreateExceptionHolidaySwapDTO,
      onBehalfOfUserId: number
    ): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPost<HolidaySwapDTO, CreateExceptionHolidaySwapDTO & { onBehalfOfUserId: number }>(
          `/api/holiday-swaps/exception/${teamMemberId}`,
          { holidayId: input.holidayId, replacementDate: input.replacementDate, onBehalfOfUserId }
        );
        options?.onSuccess?.('Holiday swap exception created successfully');
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
    async (
      swapId: number,
      input: UpdateHolidaySwapDTO,
      onBehalfOfUserId: number
    ): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, UpdateHolidaySwapDTO & { onBehalfOfUserId: number }>(
          `/api/holiday-swaps/exception/${swapId}`,
          { ...input, onBehalfOfUserId }
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
    async (
      swapId: number,
      onBehalfOfUserId: number,
      input: CancelHolidaySwapDTO = {}
    ): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, CancelHolidaySwapDTO & { onBehalfOfUserId: number }>(
          `/api/holiday-swaps/exception/${swapId}/cancel`,
          { ...input, onBehalfOfUserId }
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
    async (
      swapId: number,
      input: ReviewHolidaySwapDTO,
      onBehalfOfUserId: number
    ): Promise<HolidaySwapDTO> => {
      setLoading(true);
      try {
        const swap = await apiPatch<HolidaySwapDTO, ReviewHolidaySwapDTO & { onBehalfOfUserId: number }>(
          `/api/holiday-swaps/exception/${swapId}/review`,
          { ...input, onBehalfOfUserId }
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
