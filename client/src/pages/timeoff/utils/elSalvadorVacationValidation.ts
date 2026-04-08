/**
 * El Salvador Vacation Validation Utility
 * Frontend validation mirroring backend 7/8/15 day constraint for SV country + Vacation category
 *
 * Business Rules:
 * - Only applies to "Vacation" category for team members in country "SV"
 * - Valid request amounts: 7, 8, or 15 calendar days only
 * - Annual constraints (calendar year Jan 1 - Dec 31):
 *   - 0 days used → Can request 7, 8, or 15 days
 *   - 7 days used → Can ONLY request 8 days (to complete 15)
 *   - 8 days used → Can ONLY request 7 days (to complete 15)
 *   - 15+ days used → Blocked from requesting additional vacation
 */

import type { TimeOffWithDetailsDTO } from '../../../../../shared/dto/TimeOff';
import { parseUTCDateAsLocal } from '@/lib/utils';

/**
 * Computes the anniversary year window for SV vacation tracking.
 * Mirrors the backend computeAnniversaryWindow() logic.
 */
function computeSVAnniversaryWindow(
  teamMemberStartDate: Date,
  today: Date = new Date()
): { windowStart: Date; windowEnd: Date } {
  const currentYear = today.getFullYear();
  const month = teamMemberStartDate.getUTCMonth();
  const day = teamMemberStartDate.getUTCDate();

  const thisYearAnniversary = new Date(Date.UTC(currentYear, month, day));

  const windowStart =
    today >= thisYearAnniversary
      ? thisYearAnniversary
      : new Date(Date.UTC(currentYear - 1, month, day));

  const windowEnd = new Date(
    Date.UTC(
      windowStart.getUTCFullYear() + 1,
      windowStart.getUTCMonth(),
      windowStart.getUTCDate() - 1
    )
  );

  return { windowStart, windowEnd };
}

// Constants
const SV_COUNTRY_ISO = 'SV';
export const VACATION_CATEGORY_NAME = 'Vacation';
const ALLOWED_DAYS = [7, 8, 15] as const;
const LEGAL_MIN_DAYS = 15;
const SPLIT_STATUS_ID = 6;

// Types
export interface SVVacationValidationResult {
  valid: boolean;
  errorMessage: string | null;
  allowedDayOptions: number[];
  existingDays: number;
  nextAnniversaryDate: Date | null;
}

/**
 * Checks if the combination of country ISO and category name
 * indicates an El Salvador vacation request
 */
export function isElSalvadorVacation(
  countryIso: string | null | undefined,
  categoryName: string | undefined
): boolean {
  if (!countryIso || !categoryName) {
    return false;
  }
  return (
    countryIso.toUpperCase() === SV_COUNTRY_ISO &&
    categoryName.toLowerCase() === VACATION_CATEGORY_NAME.toLowerCase()
  );
}

/**
 * Calculates the number of calendar days between two dates (inclusive)
 */
export function calculateCalendarDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 for inclusive
}

/**
 * Calculates existing vacation days used in the anniversary year that contains referenceDate.
 * Excludes cancelled time offs and optionally excludes a specific time off (for edit mode).
 *
 * @param timeOffs - List of existing time off requests
 * @param cancelledStatusId - Status ID for cancelled time offs (to exclude)
 * @param teamMemberStartDate - Employment start date used to compute the anniversary window
 * @param currentTimeOffId - Optional ID of time off being edited (to exclude from calculation)
 * @param referenceDate - Date used to determine which anniversary window to evaluate (defaults to today)
 */
export function getExistingVacationDaysThisYear(
  timeOffs: TimeOffWithDetailsDTO[],
  cancelledStatusId: number | null,
  teamMemberStartDate: Date | null,
  currentTimeOffId?: number,
  referenceDate?: Date
): number {
  const today = referenceDate ?? new Date();

  let windowStart: Date;
  let windowEnd: Date;

  if (teamMemberStartDate) {
    const window = computeSVAnniversaryWindow(teamMemberStartDate, today);
    windowStart = window.windowStart;
    windowEnd = window.windowEnd;
  } else {
    // Fallback to calendar year when start date is unavailable
    const currentYear = today.getFullYear();
    windowStart = new Date(Date.UTC(currentYear, 0, 1));
    windowEnd = new Date(Date.UTC(currentYear, 11, 31));
  }

  return timeOffs
    .filter((timeOff) => {
      // Exclude cancelled status
      if (cancelledStatusId !== null && timeOff.statusId === cancelledStatusId) {
        return false;
      }

      // Exclude split parent records (their days are counted via the child records)
      if (timeOff.statusId === SPLIT_STATUS_ID) {
        return false;
      }

      // Exclude self if editing
      if (currentTimeOffId && timeOff.timeOffId === currentTimeOffId) {
        return false;
      }

      // Only count vacation category
      if (timeOff.categoryName.toLowerCase() !== VACATION_CATEGORY_NAME.toLowerCase()) {
        return false;
      }

      // Only count time offs starting within the anniversary window
      const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);
      if (startDate < windowStart || startDate > windowEnd) {
        return false;
      }

      return true;
    })
    .reduce((sum, timeOff) => sum + timeOff.timeOffDays, 0);
}

/**
 * Determines which day options are allowed based on existing vacation days used
 */
function getAllowedDayOptions(existingDays: number, maxAnnualDays: number): number[] {
  if (existingDays >= maxAnnualDays) {
    return []; // No options available
  }
  if (existingDays === 7) {
    return [8]; // Must request exactly 8
  }
  if (existingDays === 8) {
    return [7]; // Must request exactly 7
  }
  // 0 days used or other amount
  return [...ALLOWED_DAYS];
}

/**
 * Validates an El Salvador vacation request based on the 7/8/15 day constraint
 *
 * @param requestedDays - Number of days being requested
 * @param existingDays - Number of vacation days already used this anniversary year
 * @param accruedVacationDays - Total vacation days accrued (from win_vacation); defaults to 15
 * @param teamMemberStartDate - Employment start date used to compute the next anniversary date
 */
export function validateSVVacation(
  requestedDays: number,
  existingDays: number,
  accruedVacationDays: number = LEGAL_MIN_DAYS,
  teamMemberStartDate: Date | null = null
): SVVacationValidationResult {
  const maxAnnualDays = Math.max(LEGAL_MIN_DAYS, accruedVacationDays);
  const allowedDayOptions = getAllowedDayOptions(existingDays, maxAnnualDays);

  const nextAnniversaryDate = teamMemberStartDate
    ? (() => {
        const { windowEnd } = computeSVAnniversaryWindow(teamMemberStartDate);
        return new Date(Date.UTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth(), windowEnd.getUTCDate() + 1));
      })()
    : null;

  // Check if limit already reached
  if (existingDays >= maxAnnualDays) {
    return {
      valid: false,
      errorMessage: `You have used all ${existingDays} vacation days for this anniversary year.`,
      allowedDayOptions,
      existingDays,
      nextAnniversaryDate,
    };
  }

  // Check if requested days is valid (7, 8, or 15)
  if (!ALLOWED_DAYS.includes(requestedDays as 7 | 8 | 15)) {
    return {
      valid: false,
      errorMessage: `For El Salvador vacation, you can only request 7, 8, or 15 days. You requested ${requestedDays} days.`,
      allowedDayOptions,
      existingDays,
      nextAnniversaryDate: null,
    };
  }

  // Check annual constraints based on existing usage
  if (existingDays === 7 && requestedDays !== 8) {
    return {
      valid: false,
      errorMessage: `You already have 7 vacation days this year. To complete your 15-day annual allowance, you must request exactly 8 days.`,
      allowedDayOptions,
      existingDays,
      nextAnniversaryDate: null,
    };
  }

  if (existingDays === 8 && requestedDays !== 7) {
    return {
      valid: false,
      errorMessage: `You already have 8 vacation days this year. To complete your 15-day annual allowance, you must request exactly 7 days.`,
      allowedDayOptions,
      existingDays,
      nextAnniversaryDate: null,
    };
  }

  // Check if total would exceed limit
  const totalDays = existingDays + requestedDays;
  if (totalDays > maxAnnualDays) {
    return {
      valid: false,
      errorMessage: `You have used all ${existingDays} vacation days for this anniversary year.`,
      allowedDayOptions,
      existingDays,
      nextAnniversaryDate,
    };
  }

  return {
    valid: true,
    errorMessage: null,
    allowedDayOptions,
    existingDays,
    nextAnniversaryDate: null,
  };
}
