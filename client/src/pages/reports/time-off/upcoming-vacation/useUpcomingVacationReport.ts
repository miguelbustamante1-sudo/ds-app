import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { UpcomingVacationRowDTO } from '@shared/dto/UpcomingVacation';

const API_ENDPOINT = '/api/reports/time-off/upcoming-vacation';

async function fetchUpcomingVacation(
  teamMemberId: string,
  days: string,
): Promise<UpcomingVacationRowDTO[]> {
  const params = new URLSearchParams();
  if (teamMemberId) params.set('teamMemberId', teamMemberId);
  if (days) params.set('days', days);
  const url = params.toString() ? `${API_ENDPOINT}?${params.toString()}` : API_ENDPOINT;
  return apiGet<UpcomingVacationRowDTO[]>(url);
}

export interface UseUpcomingVacationReportResult {
  data: UpcomingVacationRowDTO[];
  isLoading: boolean;
  isError: boolean;
}

export function useUpcomingVacationReport(
  teamMemberId: string,
  days: string,
): UseUpcomingVacationReportResult {
  const { data, isLoading, isError } = useQuery<UpcomingVacationRowDTO[]>({
    queryKey: ['reports', 'upcoming-vacation', teamMemberId, days],
    queryFn: () => fetchUpcomingVacation(teamMemberId, days),
    staleTime: 60_000,
  });

  return {
    data: data ?? [],
    isLoading,
    isError,
  };
}
