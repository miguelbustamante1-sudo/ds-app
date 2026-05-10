import { useState, useCallback } from 'react';
import { apiPatch, apiPost, ApiError } from '@/lib/api';
import type {
  CreateSupervisorTimeOffDTO,
  UpdateSupervisorTimeOffDTO,
  CancelSupervisorTimeOffDTO,
} from '@shared/dto/TimeOff';
import type { TimeOff } from '@prisma/client';

const API_BASE = '/api/time-offs/exception';

export interface UseExceptionTimeOffOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useExceptionTimeOffOperations(options?: UseExceptionTimeOffOperationsOptions) {
  const [loading, setLoading] = useState(false);

  const createTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO, onBehalfOfUserId: number): Promise<TimeOff> => {
      try {
        setLoading(true);
        const created = await apiPost<TimeOff, CreateSupervisorTimeOffDTO & { onBehalfOfUserId: number }>(
          `${API_BASE}/request`,
          { ...data, onBehalfOfUserId }
        );
        options?.onSuccess?.('Time-off exception entry created successfully');
        return created;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to create time-off';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const updateTimeOff = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO, onBehalfOfUserId: number): Promise<TimeOff> => {
      try {
        setLoading(true);
        const updated = await apiPatch<TimeOff, UpdateSupervisorTimeOffDTO & { onBehalfOfUserId: number }>(
          `${API_BASE}/${timeOffId}`,
          { ...data, onBehalfOfUserId }
        );
        options?.onSuccess?.('Time-off updated successfully');
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to update time-off';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const cancelTimeOff = useCallback(
    async (timeOffId: number, comment: string, onBehalfOfUserId: number): Promise<TimeOff> => {
      try {
        setLoading(true);
        const updated = await apiPatch<TimeOff, CancelSupervisorTimeOffDTO & { onBehalfOfUserId: number }>(
          `${API_BASE}/${timeOffId}/cancel`,
          { comment, onBehalfOfUserId }
        );
        options?.onSuccess?.('Time-off cancelled successfully');
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to cancel time-off';
        options?.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { loading, createTimeOff, updateTimeOff, cancelTimeOff };
}
