import { useState, useCallback } from 'react';
import { apiGet, apiPatch, apiPost, ApiError } from '../lib/api';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, CancelSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO, ExceptionTimeOffDetailDTO } from '@shared/dto/TimeOff';
import type { TimeOff } from '@prisma/client';

const API_BASE = '/api/time-offs/exception';

export interface UseExceptionTimeOffOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useExceptionTeamMemberTimeOffs(options?: UseExceptionTimeOffOptions) {
  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTimeOffs = useCallback(async (teamMemberId: number) => {
    try {
      setLoading(true);
      const data = await apiGet<TimeOffWithDetailsDTO[]>(`${API_BASE}/team-member/${teamMemberId}`);
      setTimeOffs(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load time-offs';
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const clearTimeOffs = useCallback(() => {
    setTimeOffs([]);
  }, []);

  return { timeOffs, loading, loadTimeOffs, clearTimeOffs };
}

export function useExceptionTimeOffDetail(options?: UseExceptionTimeOffOptions) {
  const [detail, setDetail] = useState<ExceptionTimeOffDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const loadDetail = useCallback(async (timeOffId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<ExceptionTimeOffDetailDTO>(`${API_BASE}/${timeOffId}/detail`);
      setDetail(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status);
        options?.onError?.(err.message);
      } else {
        setError(500);
        options?.onError?.('Failed to load time-off detail');
      }
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { detail, loading, error, loadDetail };
}

export function useExceptionTimeOffOperations(options?: UseExceptionTimeOffOptions) {
  const [loading, setLoading] = useState(false);

  const createTimeOff = useCallback(async (data: CreateSupervisorTimeOffDTO): Promise<TimeOff> => {
    try {
      setLoading(true);
      const created = await apiPost<TimeOff, CreateSupervisorTimeOffDTO>(`${API_BASE}/request`, data);
      options?.onSuccess?.('Time-off exception entry created successfully');
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const updateTimeOff = useCallback(async (timeOffId: number, data: UpdateSupervisorTimeOffDTO): Promise<TimeOff> => {
    try {
      setLoading(true);
      const updated = await apiPatch<TimeOff, UpdateSupervisorTimeOffDTO>(
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

  const cancelTimeOff = useCallback(async (timeOffId: number, comment: string): Promise<TimeOff> => {
    try {
      setLoading(true);
      const updated = await apiPatch<TimeOff, CancelSupervisorTimeOffDTO>(
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

  return { loading, createTimeOff, updateTimeOff, cancelTimeOff };
}
