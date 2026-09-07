import { useState, useCallback } from 'react';
import { apiGet, apiPatch, ApiError } from '../lib/api';
import type { TimeOffDetailDTO } from '@shared/dto/TimeOff';

const API_BASE = '/api/time-offs/my-requests/detail';

export interface UseTimeOffDetailOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useTimeOffDetail(options?: UseTimeOffDetailOptions) {
  const [detail, setDetail] = useState<TimeOffDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const loadDetail = useCallback(async (timeOffId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TimeOffDetailDTO>(`${API_BASE}/${timeOffId}`);
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

  const acknowledgeTimeOff = useCallback(async (timeOffId: number, recipientId: number) => {
    try {
      setLoading(true);
      await apiPatch<void, { recipientId: number }>(
        `${API_BASE}/${timeOffId}/acknowledge`,
        { recipientId }
      );
      options?.onSuccess?.('Time-off acknowledged successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to acknowledge time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const declineTimeOff = useCallback(async (timeOffId: number, recipientId: number, comment: string) => {
    try {
      setLoading(true);
      await apiPatch<void, { recipientId: number; comment: string }>(
        `${API_BASE}/${timeOffId}/decline`,
        { recipientId, comment }
      );
      options?.onSuccess?.('Time-off declined successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to decline time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const cancelTimeOff = useCallback(async (timeOffId: number, comment: string) => {
    try {
      setLoading(true);
      await apiPatch<void, { comment: string }>(
        `${API_BASE}/${timeOffId}/cancel`,
        { comment }
      );
      options?.onSuccess?.('Time-off cancelled successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const supervisorApproveTimeOff = useCallback(async (timeOffId: number, comment: string) => {
    try {
      setLoading(true);
      await apiPatch<void, { comment: string }>(
        `/api/time-offs/supervisor/${timeOffId}/acknowledge`,
        { comment }
      );
      options?.onSuccess?.('Time-off approved successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to approve time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const supervisorRejectTimeOff = useCallback(async (timeOffId: number, comment: string) => {
    try {
      setLoading(true);
      await apiPatch<void, { comment: string }>(
        `/api/time-offs/supervisor/${timeOffId}/reject`,
        { comment }
      );
      options?.onSuccess?.('Time-off rejected successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reject time-off';
      options?.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    detail,
    loading,
    error,
    loadDetail,
    acknowledgeTimeOff,
    declineTimeOff,
    cancelTimeOff,
    supervisorApproveTimeOff,
    supervisorRejectTimeOff,
  };
}
