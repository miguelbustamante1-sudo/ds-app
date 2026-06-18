import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { GtVacationUnderFiveDaysRowDTO } from '@shared/dto/GtVacationUnderFiveDays';

const API_ENDPOINT = '/api/reports/time-off/gt-vacation-under-five-days';

async function fetchGtVacationUnderFiveDays(): Promise<GtVacationUnderFiveDaysRowDTO[]> {
  return apiGet<GtVacationUnderFiveDaysRowDTO[]>(API_ENDPOINT);
}

export interface UseGtVacationUnderFiveDaysReportResult {
  data: GtVacationUnderFiveDaysRowDTO[];
  isLoading: boolean;
  isError: boolean;
}

export function useGtVacationUnderFiveDaysReport(): UseGtVacationUnderFiveDaysReportResult {
  const { data, isLoading, isError } = useQuery<GtVacationUnderFiveDaysRowDTO[]>({
    queryKey: ['reports', 'gt-vacation-under-five-days'],
    queryFn: fetchGtVacationUnderFiveDays,
    staleTime: 60_000,
  });

  return {
    data: data ?? [],
    isLoading,
    isError,
  };
}
