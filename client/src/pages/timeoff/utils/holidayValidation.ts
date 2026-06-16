/**
 * Holiday Validation Utility
 * Pure functions for holiday-aware date range calculations.
 * No side effects, no React, no API calls.
 *
 * Supports:
 *  - Recurring holidays (matched by month+day, year-agnostic)
 *  - Non-recurring holidays (matched by full date)
 *  - Weekday-only holiday filtering
 *  - Net vacation day calculation (gross − weekends − weekday holidays)
 *  - Calendar highlight date generation
 */

import { eachDayOfInterval, isWeekend, differenceInCalendarDays } from 'date-fns';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';
import { parseUTCDateAsLocal } from '@/lib/utils';

// Re-exported so the hook and consumers share the same paired type.
export interface HolidayWithEffectiveDate {
  holiday: HolidayDTO;
  effectiveDate: Date;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseHolidayDate(holidayDate: Date | string): Date {
  return holidayDate instanceof Date ? holidayDate : parseUTCDateAsLocal(holidayDate);
}

/** Returns a new Date with only the month and day of `source`, set in `year`. */
function withYear(source: Date, year: number): Date {
  return new Date(year, source.getMonth(), source.getDate());
}

// ---------------------------------------------------------------------------
// Core: getHolidaysInRangeWithDates
// ---------------------------------------------------------------------------

/**
 * Returns active holidays that fall within [startDate, endDate], paired with
 * their effective date (year-normalised for recurring holidays).
 *
 * Recurring holidays: matched by month+day across both the year of startDate
 * and the year of endDate (a range can span two calendar years).
 * Non-recurring holidays: matched by their exact stored date.
 */
export function getHolidaysInRangeWithDates(
  holidays: HolidayDTO[],
  startDate: Date,
  endDate: Date,
): HolidayWithEffectiveDate[] {
  const result: HolidayWithEffectiveDate[] = [];

  for (const holiday of holidays) {
    if (!holiday.holidayIsActive) continue;

    const stored = parseHolidayDate(holiday.holidayDate);

    if (holiday.holidayIsRecurring) {
      // A range can span two calendar years — check both to avoid missing edge cases.
      const yearsToCheck = new Set([startDate.getFullYear(), endDate.getFullYear()]);
      let matched = false;

      for (const year of yearsToCheck) {
        if (matched) break;
        const effective = withYear(stored, year);
        if (effective >= startDate && effective <= endDate) {
          result.push({ holiday, effectiveDate: effective });
          matched = true;
        }
      }
    } else {
      if (stored >= startDate && stored <= endDate) {
        result.push({ holiday, effectiveDate: stored });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Derived: getHolidaysInRange (plain DTO list)
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper — returns only the HolidayDTO array without effective dates.
 */
export function getHolidaysInRange(
  holidays: HolidayDTO[],
  startDate: Date,
  endDate: Date,
): HolidayDTO[] {
  return getHolidaysInRangeWithDates(holidays, startDate, endDate).map(({ holiday }) => holiday);
}

// ---------------------------------------------------------------------------
// filterWeekdayHolidays
// ---------------------------------------------------------------------------

/**
 * Filters to only holidays whose effective date falls Monday–Friday.
 * Accepts the paired output of getHolidaysInRangeWithDates so that the
 * effective (year-normalised) date is used for the weekday check, not the
 * stored year.
 */
export function filterWeekdayHolidays(
  holidaysWithDates: HolidayWithEffectiveDate[],
): HolidayWithEffectiveDate[] {
  return holidaysWithDates.filter(({ effectiveDate }) => {
    const day = effectiveDate.getDay();
    return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
  });
}

// ---------------------------------------------------------------------------
// calculateNetVacationDays
// ---------------------------------------------------------------------------

/**
 * Calculates net (business) vacation days in [startDate, endDate].
 *
 * Formula (from requirement §3.2):
 *   gross_days        = differenceInCalendarDays(endDate, startDate) + 1
 *   weekend_days      = count of Saturdays and Sundays in the range
 *   weekday_holidays  = weekdayHolidaysInRange.length
 *   net_vacation_days = gross_days − weekend_days − weekday_holidays
 *
 * Examples:
 *   Mon Jul 1 – Fri Jul 5, 1 weekday holiday → 4 days
 *   Sat Jul 6 – Fri Jul 12, 1 weekday holiday (Wed) → 4 days
 */
export function calculateNetVacationDays(
  startDate: Date,
  endDate: Date,
  weekdayHolidaysInRange: HolidayWithEffectiveDate[],
): number {
  const grossDays = differenceInCalendarDays(endDate, startDate) + 1;
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekendDays = allDays.filter((d) => isWeekend(d)).length;
  const weekdayHolidayWeight = weekdayHolidaysInRange.reduce(
    (sum, { holiday }) => sum + (holiday.holidayIsHalfDay ? 0.5 : 1),
    0,
  );
  return grossDays - weekendDays - weekdayHolidayWeight;
}

// ---------------------------------------------------------------------------
// isDateInHolidayList
// ---------------------------------------------------------------------------

/**
 * Returns true if `date` matches any date in `holidayDates` (year-month-day).
 * Use this to check whether a specific date (e.g. start date) falls on a holiday.
 */
export function isDateInHolidayList(date: Date, holidayDates: Date[]): boolean {
  return holidayDates.some(
    (h) =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate(),
  );
}

// ---------------------------------------------------------------------------
// buildCalendarHolidayDates
// ---------------------------------------------------------------------------

/**
 * Produces a flat Date[] suitable for react-day-picker `modifiers.holiday`.
 *
 * Recurring holidays: one Date per year in yearRange, same month+day.
 * Non-recurring holidays: included exactly once.
 */
export function buildCalendarHolidayDates(
  holidays: HolidayDTO[],
  yearRange: number[],
): Date[] {
  const dates: Date[] = [];

  for (const holiday of holidays) {
    const stored = parseUTCDateAsLocal(holiday.holidayDate);

    if (holiday.holidayIsRecurring) {
      for (const year of yearRange) {
        dates.push(withYear(stored, year));
      }
    } else {
      dates.push(stored);
    }
  }

  return dates;
}

// ---------------------------------------------------------------------------
// applySwapsToHolidays
// ---------------------------------------------------------------------------

/**
 * Returns a modified holiday list that reflects the user's active swaps:
 *  - Removes the original holiday (matched by holidayId) from the list.
 *  - Adds a synthetic "virtual holiday" for the replacementDate.
 *
 * The virtual entry reuses the original holiday's metadata but has its
 * holidayDate set to the replacementDate and holidayIsRecurring = false.
 */
export function applySwapsToHolidays(
  holidays: HolidayDTO[],
  activeSwaps: ActiveSwapSummaryDTO[],
): HolidayDTO[] {
  if (activeSwaps.length === 0) return holidays;

  const swappedIds = new Set(activeSwaps.map((s) => s.holidayId));

  // Remove original holidays that have been swapped out
  const filtered = holidays.filter((h) => !swappedIds.has(h.holidayId));

  // Add a virtual entry for each replacement date
  for (const swap of activeSwaps) {
    const original = holidays.find((h) => h.holidayId === swap.holidayId);
    if (!original) continue;

    filtered.push({
      ...original,
      holidayDate: parseUTCDateAsLocal(swap.replacementDate).toISOString(),
      holidayIsRecurring: false,
      holidayIsActive: true,
    });
  }

  return filtered;
}
