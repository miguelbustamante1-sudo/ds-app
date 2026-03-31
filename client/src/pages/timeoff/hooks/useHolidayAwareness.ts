/**
 * useHolidayAwareness
 * Pure derivation hook — reads effectiveHolidays from the nearest HolidayProvider
 * and derives SV/GT-specific notice values reactively as dates change.
 *
 * MUST be called within a HolidayProvider tree.
 *
 * Behaviour:
 *  - SV: returns all active holidays in the selected range.
 *  - GT + Vacation: returns weekday-only holidays and the net vacation day count.
 *  - Other countries: all outputs are empty/null.
 */

import { useMemo } from 'react';
import {
  getHolidaysInRangeWithDates,
  filterWeekdayHolidays,
  calculateNetVacationDays,
  buildCalendarHolidayDates,
  type HolidayWithEffectiveDate,
} from '../utils/holidayValidation';
import { useHolidayContext } from '../context/HolidayContext';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseHolidayAwarenessInput {
  countryIso: string | null | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  /** Used to gate GT logic — only 'Vacation' (case-insensitive) triggers it. */
  categoryName: string | undefined;
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
  const { countryIso, startDate, endDate, categoryName } = input;

  const { effectiveHolidays, loading } = useHolidayContext();

  const normalizedIso = countryIso?.toUpperCase();
  const isSupported = normalizedIso === 'SV' || normalizedIso === 'GT';

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
