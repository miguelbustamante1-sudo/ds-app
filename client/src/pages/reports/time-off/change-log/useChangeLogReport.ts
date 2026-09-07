import { useQuery } from '@tanstack/react-query';
import type { TimeOffChangeLogRowDTO, TimeOffChangeLogResponseDTO } from '@shared/dto/TimeOffChangeLog';

const API_BASE = '/api/reports/time-off/change-log';

async function fetchChangeLog(searchParams: URLSearchParams): Promise<TimeOffChangeLogResponseDTO> {
  const url = `${API_BASE}?${searchParams.toString()}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface UseChangeLogReportResult {
  data: TimeOffChangeLogRowDTO[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Fetches the time-off change log report.
 * The query only fires when `run=1` is present in the search params (URL is the source of truth).
 * Caller triggers a fetch by navigating with `run=1`; resetting filters removes `run`.
 */
export function useChangeLogReport(searchParams: URLSearchParams): UseChangeLogReportResult {
  const isEnabled = searchParams.get('run') === '1';
  const queryKey = ['reports', 'timeoff-change-log', searchParams.toString()];

  const { data, isLoading, isError, refetch } = useQuery<TimeOffChangeLogResponseDTO>({
    queryKey,
    queryFn: () => fetchChangeLog(searchParams),
    enabled: isEnabled,
    staleTime: 60_000, // 1 min — avoid re-fetching on tab focus
  });

  return {
    data: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    refetch,
  };
}
