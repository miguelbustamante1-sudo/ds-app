/**
 * Hook for My Time Off operations (cancel and edit)
 */

import { useState, useCallback } from 'react';
import { apiPatch, ApiError } from '../lib/api';
import type { CancelMyTimeOffDTO, UpdateMyTimeOffDTO } from '@shared/dto/TimeOff';
import type { TimeOff } from '@prisma/client';

const API_BASE = '/api/time-offs/my-requests';

export interface UseMyTimeOffOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useMyTimeOffOperations(options?: UseMyTimeOffOperationsOptions) {
  const [loading, setLoading] = useState(false);

  const cancelTimeOff = useCallback(async (timeOffId: number, comment: string): Promise<TimeOff> => {
    try {
      setLoading(true);
      const updated = await apiPatch<TimeOff, CancelMyTimeOffDTO>(
        `${API_BASE}/${timeOffId}/cancel`,
        { comment }
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
  }, [options]);

  const updateTimeOff = useCallback(async (timeOffId: number, data: UpdateMyTimeOffDTO): Promise<TimeOff> => {
    try {
      setLoading(true);
      const updated = await apiPatch<TimeOff, UpdateMyTimeOffDTO>(
        `${API_BASE}/${timeOffId}`,
        data
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
  }, [options]);

  return {
    loading,
    cancelTimeOff,
    updateTimeOff,
  };
}
