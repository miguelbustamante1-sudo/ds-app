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
  activeSwaps: ActiveSwapSummaryDTO[];
  loading: boolean;
}

const HolidayContext = createContext<HolidayContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface HolidayProviderProps {
  countryId: number | null | undefined;
  countryIso: string | null | undefined;
  /**
   * The team member whose active holiday swaps should be resolved. Omit for
   * self-service forms (fetches the logged-in caller's own swaps); pass the
   * subject team member's id for supervisor/exception forms acting on their
   * behalf — otherwise the swaps fetched would be the caller's (e.g. the
   * supervisor's), not the team member the form is actually for.
   */
  teamMemberId?: number | null;
  children: ReactNode;
}

export function HolidayProvider({ countryId, teamMemberId, children }: HolidayProviderProps) {
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [activeSwaps, setActiveSwaps] = useState<ActiveSwapSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch holiday list for any country that has one.
  useEffect(() => {
    if (!countryId) {
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
  }, [countryId]);

  // Fetch active (acknowledged) holiday swaps for teamMemberId, or the
  // logged-in caller's own swaps when no teamMemberId is given.
  useEffect(() => {
    let cancelled = false;

    const url = teamMemberId
      ? `/api/holiday-swaps/team/${teamMemberId}/active-swaps`
      : '/api/holiday-swaps/my/active-swaps';

    apiGet<ActiveSwapSummaryDTO[]>(url)
      .then((data) => {
        if (!cancelled) setActiveSwaps(data);
      })
      .catch(() => {
        if (!cancelled) setActiveSwaps([]);
      });

    return () => {
      cancelled = true;
    };
  }, [teamMemberId]);

  // Apply swaps — removes original holiday dates and inserts replacement dates.
  const effectiveHolidays = useMemo<HolidayDTO[]>(
    () => applySwapsToHolidays(holidays, activeSwaps),
    [holidays, activeSwaps],
  );

  // Date[] for react-day-picker highlighting across the calendar year window.
  const holidayDatesForCalendar = useMemo<Date[]>(() => {
    if (effectiveHolidays.length === 0) return [];
    return buildCalendarHolidayDates(effectiveHolidays, CALENDAR_YEAR_WINDOW);
  }, [effectiveHolidays]);

  // Convenience function so consumers do not import isDateInHolidayList directly.
  const isHoliday = useMemo(
    () => (date: Date) => isDateInHolidayList(date, holidayDatesForCalendar),
    [holidayDatesForCalendar],
  );

  const value = useMemo<HolidayContextValue>(
    () => ({ effectiveHolidays, holidayDatesForCalendar, isHoliday, activeSwaps, loading }),
    [effectiveHolidays, holidayDatesForCalendar, isHoliday, activeSwaps, loading],
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
