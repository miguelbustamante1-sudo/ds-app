/**
 * useHolidayAwareness
 * Pure derivation hook — reads effectiveHolidays from the nearest HolidayProvider
 * and derives holiday-aware values reactively as dates change.
 *
 * MUST be called within a HolidayProvider tree.
 *
 * Behaviour:
 *  - holidayDatesForCalendar / fullDayHolidayDatesForBlocking: available for ANY
 *    country with holiday data (used to drive the countHolidays-aware fixed-duration
 *    projection and start-date blocking).
 *  - SV: svHolidaysInRange returns all active holidays in the selected range.
 *  - GT + workday-based category: gtWeekdayHolidaysInRange / gtNetVacationDays return
 *    weekday-only holidays and the net vacation day count. These remain GT-specific
 *    notice helpers, unrelated to the countHolidays setting.
 */

import { useMemo } from 'react';
import {
  getHolidaysInRangeWithDates,
  filterWeekdayHolidays,
  calculateNetVacationDays,
  buildCalendarHolidayDates,
  buildFullDayHolidayDates,
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
  /**
   * True when the selected category counts calendar days (e.g. SV Vacation's fixed
   * 15-day rule). False for workday-based categories. GT's weekday-holiday exclusion
   * (gtWeekdayHolidaysInRange / gtNetVacationDays) only applies when this is false —
   * it covers every GT workday-based category (Vacation, Personal Days, etc.), not
   * just ones literally named "Vacation".
   */
  isCalendar: boolean;
}

export interface UseHolidayAwarenessResult {
  /** SV — all active holidays in the selected date range. */
  svHolidaysInRange: HolidayWithEffectiveDate[];
  /** GT — weekday-only holidays in range (workday-based categories only). */
  gtWeekdayHolidaysInRange: HolidayWithEffectiveDate[];
  /** Computed net workday-based days for GT; null when conditions are not met. */
  gtNetVacationDays: number | null;
  /** Date[] for react-day-picker holiday highlighting (any country with holiday data). */
  holidayDatesForCalendar: Date[];
  /** Date[] of ONLY full-day holidays — use this to disable/block a start-date selection. Half-day holidays are excluded so they remain selectable. */
  fullDayHolidayDatesForBlocking: Date[];
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
  const { countryIso, startDate, endDate, isCalendar } = input;

  const { effectiveHolidays, loading } = useHolidayContext();

  const normalizedIso = countryIso?.toUpperCase();

  // SV: all active holidays in range (re-derived when dates change, no fetch).
  const svHolidaysInRange = useMemo<HolidayWithEffectiveDate[]>(() => {
    if (normalizedIso !== 'SV' || !startDate || !endDate || effectiveHolidays.length === 0) {
      return [];
    }
    return getHolidaysInRangeWithDates(effectiveHolidays, startDate, endDate);
  }, [normalizedIso, effectiveHolidays, startDate, endDate]);

  // GT: weekday-only holidays in range — for any workday-based (non-calendar) GT category.
  const gtWeekdayHolidaysInRange = useMemo<HolidayWithEffectiveDate[]>(() => {
    if (
      normalizedIso !== 'GT' ||
      isCalendar ||
      !startDate ||
      !endDate ||
      effectiveHolidays.length === 0
    ) {
      return [];
    }
    const inRange = getHolidaysInRangeWithDates(effectiveHolidays, startDate, endDate);
    return filterWeekdayHolidays(inRange);
  }, [normalizedIso, isCalendar, effectiveHolidays, startDate, endDate]);

  // GT net workday-based days — null when no weekday holidays (or conditions not met).
  const gtNetVacationDays = useMemo<number | null>(() => {
    if (
      normalizedIso !== 'GT' ||
      isCalendar ||
      !startDate ||
      !endDate ||
      gtWeekdayHolidaysInRange.length === 0
    ) {
      return null;
    }
    return calculateNetVacationDays(startDate, endDate, gtWeekdayHolidaysInRange);
  }, [normalizedIso, isCalendar, startDate, endDate, gtWeekdayHolidaysInRange]);

  // Calendar highlight dates for any country with holiday data loaded.
  const holidayDatesForCalendar = useMemo<Date[]>(() => {
    if (effectiveHolidays.length === 0) return [];
    return buildCalendarHolidayDates(effectiveHolidays, CALENDAR_YEAR_WINDOW);
  }, [effectiveHolidays]);

  const fullDayHolidayDatesForBlocking = useMemo<Date[]>(() => {
    if (effectiveHolidays.length === 0) return [];
    return buildFullDayHolidayDates(effectiveHolidays, CALENDAR_YEAR_WINDOW);
  }, [effectiveHolidays]);

  return {
    svHolidaysInRange,
    gtWeekdayHolidaysInRange,
    gtNetVacationDays,
    holidayDatesForCalendar,
    fullDayHolidayDatesForBlocking,
    loading,
  };
}
