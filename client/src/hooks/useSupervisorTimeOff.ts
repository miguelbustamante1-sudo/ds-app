/**
 * Hooks for Supervisor Time Off Management
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, ApiError } from '../lib/api';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, CancelSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { TimeOff } from '@prisma/client';

const API_BASE = '/api/time-offs/supervisor';

export interface UseSupervisorTimeOffOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for fetching supervised team members
 */
export function useMyTeamMembers(options?: UseSupervisorTimeOffOptions) {
  const [teamMembers, setTeamMembers] = useState<SupervisedTeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<SupervisedTeamMemberDTO[]>(`${API_BASE}/my-team-members`);
      setTeamMembers(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load team members';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    teamMembers,
    loading,
    error,
    loadTeamMembers,
  };
}

/**
 * Hook for fetching time-offs for a specific team member
 */
export function useTeamMemberTimeOffs(options?: UseSupervisorTimeOffOptions) {
  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeOffs = useCallback(async (teamMemberId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TimeOffWithDetailsDTO[]>(`${API_BASE}/team-member/${teamMemberId}`);
      setTimeOffs(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load time-offs';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const clearTimeOffs = useCallback(() => {
    setTimeOffs([]);
    setError(null);
  }, []);

  return {
    timeOffs,
    loading,
    error,
    loadTimeOffs,
    clearTimeOffs,
    setTimeOffs,
  };
}

/**
 * Hook for supervisor time-off operations (create/cancel)
 */
export function useSupervisorTimeOffOperations(options?: UseSupervisorTimeOffOptions) {
  const [loading, setLoading] = useState(false);

  const createTimeOff = useCallback(async (data: CreateSupervisorTimeOffDTO): Promise<TimeOff> => {
    try {
      setLoading(true);
      const created = await apiPost<TimeOff, CreateSupervisorTimeOffDTO>(`${API_BASE}/request`, data);
      options?.onSuccess?.('Time-off created successfully');
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create time-off';
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

  return {
    loading,
    createTimeOff,
    cancelTimeOff,
    updateTimeOff,
  };
}
