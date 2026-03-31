import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';
import { apiGet } from '@/lib/api';
import {
  applySwapsToHolidays,
  buildCalendarHolidayDates,
  isDateInHolidayList,
} from '../utils/holidayValidation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALENDAR_YEAR_WINDOW = [
  new Date().getFullYear(),
  new Date().getFullYear() + 1,
];

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface HolidayContextValue {
  effectiveHolidays: HolidayDTO[];
  holidayDatesForCalendar: Date[];
  isHoliday: (date: Date) => boolean;
  loading: boolean;
}

const HolidayContext = createContext<HolidayContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface HolidayProviderProps {
  countryId: number | null | undefined;
  countryIso: string | null | undefined;
  children: ReactNode;
}

export function HolidayProvider({ countryId, countryIso, children }: HolidayProviderProps) {
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [activeSwaps, setActiveSwaps] = useState<ActiveSwapSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedIso = countryIso?.toUpperCase();
  const isSupported = normalizedIso === 'SV' || normalizedIso === 'GT';

  // Fetch holiday list once per supported country.
  useEffect(() => {
    if (!isSupported || !countryId) {
      setHolidays([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiGet<HolidayDTO[]>(`/api/time-off-holidays/${countryId}`)
      .then((data) => {
        if (!cancelled) setHolidays(data);
      })
      .catch(() => {
        if (!cancelled) setHolidays([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryId, isSupported]);

  // Fetch the logged-in user's active (acknowledged) holiday swaps once on mount.
  useEffect(() => {
    let cancelled = false;

    apiGet<ActiveSwapSummaryDTO[]>('/api/holiday-swaps/my/active-swaps')
      .then((data) => {
        if (!cancelled) setActiveSwaps(data);
      })
      .catch(() => {
        if (!cancelled) setActiveSwaps([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Apply swaps — removes original holiday dates and inserts replacement dates.
  const effectiveHolidays = useMemo<HolidayDTO[]>(
    () => applySwapsToHolidays(holidays, activeSwaps),
    [holidays, activeSwaps],
  );

  // Date[] for react-day-picker highlighting across the calendar year window.
  const holidayDatesForCalendar = useMemo<Date[]>(() => {
    if (!isSupported || effectiveHolidays.length === 0) return [];
    return buildCalendarHolidayDates(effectiveHolidays, CALENDAR_YEAR_WINDOW);
  }, [isSupported, effectiveHolidays]);

  // Convenience function so consumers do not import isDateInHolidayList directly.
  const isHoliday = useMemo(
    () => (date: Date) => isDateInHolidayList(date, holidayDatesForCalendar),
    [holidayDatesForCalendar],
  );

  const value = useMemo<HolidayContextValue>(
    () => ({ effectiveHolidays, holidayDatesForCalendar, isHoliday, loading }),
    [effectiveHolidays, holidayDatesForCalendar, isHoliday, loading],
  );

  return <HolidayContext.Provider value={value}>{children}</HolidayContext.Provider>;
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useHolidayContext(): HolidayContextValue {
  const ctx = useContext(HolidayContext);
  if (!ctx) throw new Error('useHolidayContext must be used within a HolidayProvider');
  return ctx;
}
