// client/src/hooks/useTimeOffLookups.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { TimeOffCategoryDTO } from '@shared/dto/TimeOffCategory';
import type { TimeOffStatusDTO } from '@shared/dto/TimeOffStatus';

/** Full list of time-off categories, cached for 5 minutes. */
export function useTimeOffCategoryList() {
  return useQuery<TimeOffCategoryDTO[]>({
    queryKey: ['time-off-categories'],
    queryFn: () => apiGet<TimeOffCategoryDTO[]>('/api/time-off-category'),
    staleTime: 300_000,
  });
}

/** Full list of time-off statuses, cached for 5 minutes. */
export function useTimeOffStatusList() {
  return useQuery<TimeOffStatusDTO[]>({
    queryKey: ['time-off-statuses'],
    queryFn: () => apiGet<TimeOffStatusDTO[]>('/api/time-off-statuses'),
    staleTime: 300_000,
  });
}

/** categoryId -> categoryName map, built from the cached category list. */
export function useCategoryNameMap(): Record<number, string> {
  const { data = [] } = useTimeOffCategoryList();
  return Object.fromEntries(data.map((c) => [c.categoryId, c.categoryName]));
}

/** statusId -> statusName map, built from the cached status list. */
export function useStatusNameMap(): Record<number, string> {
  const { data = [] } = useTimeOffStatusList();
  return Object.fromEntries(data.map((s) => [s.statusId, s.statusName]));
}
