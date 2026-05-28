/**
 * Hooks for Supervisor Time Off Management
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, ApiError } from '../lib/api';
import type { SupervisorTeamOverviewDTO } from '@shared/dto/SupervisorTeamOverview';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, CancelSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO, TeamTimeOffCurrentMonthDTO, TeamMemberYearlySummaryDTO, TeamMemberTimeOffBreakdownDTO, TimeOffWithTeamMemberDTO } from '@shared/dto/TimeOff';
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
  const [teamMembers, setTeamMembers] = useState<TeamMemberReportDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TeamMemberReportDTO[]>('/api/team-members/my-reports?hierarchy=complete');
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

/**
 * Hook for fetching team time-off for current month (dashboard card)
 */
export function useTeamTimeOffCurrentMonth(options?: UseSupervisorTimeOffOptions) {
  const [data, setData] = useState<TeamTimeOffCurrentMonthDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<TeamTimeOffCurrentMonthDTO>(`${API_BASE}/team-timeoff-current-month`);
      setData(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load current month time-off data';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    data,
    loading,
    error,
    loadData,
  };
}

/**
 * Hook for fetching yearly time-off summary for all team members
 */
export function useTeamYearlySummary(options?: UseSupervisorTimeOffOptions) {
  const [summaries, setSummaries] = useState<TeamMemberYearlySummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummaries = useCallback(async (year?: number) => {
    try {
      setLoading(true);
      setError(null);
      const url = year ? `${API_BASE}/team-yearly-summary?year=${year}` : `${API_BASE}/team-yearly-summary`;
      const data = await apiGet<TeamMemberYearlySummaryDTO[]>(url);
      setSummaries(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load yearly summary';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    summaries,
    loading,
    error,
    loadSummaries,
  };
}

/**
 * Hook for fetching time-off breakdown by category for a team member
 */
export function useTeamMemberTimeOffBreakdown(options?: UseSupervisorTimeOffOptions) {
  const [breakdown, setBreakdown] = useState<TeamMemberTimeOffBreakdownDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBreakdown = useCallback(async (teamMemberId: number, year?: number) => {
    try {
      setLoading(true);
      setError(null);
      const url = year
        ? `${API_BASE}/team-member/${teamMemberId}/yearly-breakdown?year=${year}`
        : `${API_BASE}/team-member/${teamMemberId}/yearly-breakdown`;
      const data = await apiGet<TeamMemberTimeOffBreakdownDTO>(url);
      setBreakdown(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load time-off breakdown';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const clearBreakdown = useCallback(() => {
    setBreakdown(null);
    setError(null);
  }, []);

  return {
    breakdown,
    loading,
    error,
    loadBreakdown,
    clearBreakdown,
  };
}

interface WorkdayBalance {
  vacation: number;
  personalDays: number;
  exceptionDaysUsed: number;
  exceptionDaysRemaining: number;
}

/**
 * Hook for fetching a team member's Workday balance (vacation + personal days)
 */
export function useTeamMemberWorkdayBalance() {
  const [balance, setBalance] = useState<WorkdayBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = useCallback(async (teamMemberId: number): Promise<void> => {
    try {
      setLoading(true);
      const data = await apiGet<WorkdayBalance>(`${API_BASE}/team-member/${teamMemberId}/workday-balance`);
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearBalance = useCallback(() => {
    setBalance(null);
  }, []);

  return { balance, loading, loadBalance, clearBalance };
}

/**
 * Hook for fetching all time-offs for all supervised team members
 */
export function useAllTeamTimeOffs(options?: UseSupervisorTimeOffOptions) {
  const [timeOffs, setTimeOffs] = useState<TimeOffWithTeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeOffs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TimeOffWithTeamMemberDTO[]>(`${API_BASE}/all-team-timeoffs`);
      setTimeOffs(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load team time-offs';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const refreshTimeOffs = useCallback(() => {
    loadTimeOffs();
  }, [loadTimeOffs]);

  return {
    timeOffs,
    loading,
    error,
    loadTimeOffs,
    refreshTimeOffs,
  };
}

/**
 * Hook for fetching supervised team members with vacation balance (team overview page).
 */
export function useMyTeamOverview(options?: UseSupervisorTimeOffOptions) {
  const [teamOverview, setTeamOverview] = useState<SupervisorTeamOverviewDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<SupervisorTeamOverviewDTO[]>('/api/team-members/my-reports-overview');
      setTeamOverview(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load team overview';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    teamOverview,
    loading,
    error,
    loadTeamOverview,
  };
}
