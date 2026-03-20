/**
 * useHolidayAwareness
 * Custom hook that fetches holiday data once per country and derives
 * SV/GT-specific notice values reactively as dates change.
 *
 * Behaviour:
 *  - Fetches GET /api/time-off-holidays/:countryId once on mount (or when
 *    countryId changes). No re-fetch when dates or categoryName change.
 *  - SV: returns all active holidays in the selected range.
 *  - GT + Vacation: returns weekday-only holidays and the net vacation day count.
 *  - Other countries: no API call; all outputs are empty/null.
 */

import { useState, useEffect, useMemo } from 'react';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';
import { apiGet } from '@/lib/api';
import {
  getHolidaysInRangeWithDates,
  filterWeekdayHolidays,
  calculateNetVacationDays,
  buildCalendarHolidayDates,
  applySwapsToHolidays,
  type HolidayWithEffectiveDate,
} from '../utils/holidayValidation';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseHolidayAwarenessInput {
  countryIso: string | null | undefined;
  countryId: number | null | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  /** Used to gate GT logic — only 'Vacation' (case-insensitive) triggers it. */
  categoryName: string | undefined;
  /** Active acknowledged holiday swaps for the team member. Applied as substitutions. */
  activeSwaps: ActiveSwapSummaryDTO[];
}

export interface UseHolidayAwarenessResult {
  /** SV — all active holidays in the selected date range. */
  svHolidaysInRange: HolidayWithEffectiveDate[];
  /** GT — weekday-only holidays in range (Vacation category only). */
  gtWeekdayHolidaysInRange: HolidayWithEffectiveDate[];
  /** Computed net vacation days for GT Vacation; null when conditions are not met. */
  gtNetVacationDays: number | null;
  /** Date[] for react-day-picker holiday highlighting (SV and GT only). */
  holidayDatesForCalendar: Date[];
  /** True while the initial fetch is in-flight. */
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Module-level constants (evaluated once; year won't change within a session)
// ---------------------------------------------------------------------------

const CALENDAR_YEAR_WINDOW = [
  new Date().getFullYear(),
  new Date().getFullYear() + 1,
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHolidayAwareness(
  input: UseHolidayAwarenessInput,
): UseHolidayAwarenessResult {
  const { countryIso, countryId, startDate, endDate, categoryName, activeSwaps } = input;

  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedIso = countryIso?.toUpperCase();
  const isSupported = normalizedIso === 'SV' || normalizedIso === 'GT';

  // Fetch once per supported country.
  // Deliberately excludes startDate / endDate / categoryName from deps so that
  // changing dates does not trigger a new network request.
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
  }, [countryId, isSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effective holiday list: raw holidays modified by the user's active swaps.
  // Removes original holiday dates and inserts replacement dates in their place.
  const effectiveHolidays = useMemo<HolidayDTO[]>(
    () => applySwapsToHolidays(holidays, activeSwaps),
    [holidays, activeSwaps],
  );

  // SV: all active holidays in range (re-derived when dates change, no fetch).
  const svHolidaysInRange = useMemo<HolidayWithEffectiveDate[]>(() => {
    if (normalizedIso !== 'SV' || !startDate || !endDate || effectiveHolidays.length === 0) {
      return [];
    }
    return getHolidaysInRangeWithDates(effectiveHolidays, startDate, endDate);
  }, [normalizedIso, effectiveHolidays, startDate, endDate]);

  // GT: weekday-only holidays in range — only when category is Vacation.
  const gtWeekdayHolidaysInRange = useMemo<HolidayWithEffectiveDate[]>(() => {
    if (
      normalizedIso !== 'GT' ||
      !categoryName ||
      categoryName.toLowerCase() !== 'vacation' ||
      !startDate ||
      !endDate ||
      effectiveHolidays.length === 0
    ) {
      return [];
    }
    const inRange = getHolidaysInRangeWithDates(effectiveHolidays, startDate, endDate);
    return filterWeekdayHolidays(inRange);
  }, [normalizedIso, categoryName, effectiveHolidays, startDate, endDate]);

  // GT net vacation days — null when no weekday holidays (or conditions not met).
  const gtNetVacationDays = useMemo<number | null>(() => {
    if (
      normalizedIso !== 'GT' ||
      !categoryName ||
      categoryName.toLowerCase() !== 'vacation' ||
      !startDate ||
      !endDate ||
      gtWeekdayHolidaysInRange.length === 0
    ) {
      return null;
    }
    return calculateNetVacationDays(startDate, endDate, gtWeekdayHolidaysInRange);
  }, [normalizedIso, categoryName, startDate, endDate, gtWeekdayHolidaysInRange]);

  // Calendar highlight dates for both SV and GT.
  const holidayDatesForCalendar = useMemo<Date[]>(() => {
    if (!isSupported || effectiveHolidays.length === 0) return [];
    return buildCalendarHolidayDates(effectiveHolidays, CALENDAR_YEAR_WINDOW);
  }, [isSupported, effectiveHolidays]);

  return {
    svHolidaysInRange,
    gtWeekdayHolidaysInRange,
    gtNetVacationDays,
    holidayDatesForCalendar,
    loading,
  };
}
