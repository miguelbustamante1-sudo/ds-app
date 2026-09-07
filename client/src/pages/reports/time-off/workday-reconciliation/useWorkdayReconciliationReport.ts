import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';

const API_ENDPOINT = '/api/reports/time-off/workday-reconciliation';

async function fetchWorkdayReconciliation(): Promise<WorkdayReconciliationRowDTO[]> {
  return apiGet<WorkdayReconciliationRowDTO[]>(API_ENDPOINT);
}

export interface UseWorkdayReconciliationReportResult {
  data: WorkdayReconciliationRowDTO[];
  isLoading: boolean;
  isError: boolean;
}

export function useWorkdayReconciliationReport(): UseWorkdayReconciliationReportResult {
  const { data, isLoading, isError } = useQuery<WorkdayReconciliationRowDTO[]>({
    queryKey: ['reports', 'workday-reconciliation'],
    queryFn: fetchWorkdayReconciliation,
    staleTime: 60_000,
  });

  return {
    data: data ?? [],
    isLoading,
    isError,
  };
}
