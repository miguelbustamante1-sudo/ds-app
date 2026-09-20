// client/src/hooks/useHolidayLookups.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { HolidayDTO } from '@shared/dto/Holiday';

export function useHolidayList() {
  return useQuery<HolidayDTO[]>({
    queryKey: ['holidays-all'],
    queryFn: () => apiGet<HolidayDTO[]>('/api/holidays'),
    staleTime: 300_000,
  });
}

/** holidayId -> holidayName map, built from the cached holiday list. */
export function useHolidayNameMap(): Record<number, string> {
  const { data = [] } = useHolidayList();
  return Object.fromEntries(data.map((h) => [h.holidayId, h.holidayName]));
}
