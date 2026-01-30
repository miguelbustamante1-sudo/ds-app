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

// Constants
const SV_COUNTRY_ISO = 'SV';
const VACATION_CATEGORY_NAME = 'Vacation';
const ALLOWED_DAYS = [7, 8, 15] as const;
const MAX_ANNUAL_DAYS = 15;

// Types
export interface SVVacationValidationResult {
  valid: boolean;
  errorMessage: string | null;
  allowedDayOptions: number[];
  existingDays: number;
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
 * Calculates existing vacation days used in the current calendar year.
 * Excludes cancelled time offs and optionally excludes a specific time off (for edit mode).
 *
 * @param timeOffs - List of existing time off requests
 * @param cancelledStatusId - Status ID for cancelled time offs (to exclude)
 * @param currentTimeOffId - Optional ID of time off being edited (to exclude from calculation)
 */
export function getExistingVacationDaysThisYear(
  timeOffs: TimeOffWithDetailsDTO[],
  cancelledStatusId: number | null,
  currentTimeOffId?: number
): number {
  const currentYear = new Date().getFullYear();

  return timeOffs
    .filter((timeOff) => {
      // Exclude cancelled status
      if (cancelledStatusId !== null && timeOff.statusId === cancelledStatusId) {
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

      // Only count time offs starting in current year
      const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);
      if (startDate.getFullYear() !== currentYear) {
        return false;
      }

      return true;
    })
    .reduce((sum, timeOff) => sum + timeOff.timeOffDays, 0);
}

/**
 * Determines which day options are allowed based on existing vacation days used
 */
function getAllowedDayOptions(existingDays: number): number[] {
  if (existingDays >= MAX_ANNUAL_DAYS) {
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
 * @param existingDays - Number of vacation days already used this year
 */
export function validateSVVacation(
  requestedDays: number,
  existingDays: number
): SVVacationValidationResult {
  const allowedDayOptions = getAllowedDayOptions(existingDays);

  // Check if limit already reached (15+ days used)
  if (existingDays >= MAX_ANNUAL_DAYS) {
    return {
      valid: false,
      errorMessage: `You have already used ${existingDays} vacation days this year. The maximum annual vacation allowance for El Salvador is 15 days. No additional vacation can be requested.`,
      allowedDayOptions,
      existingDays,
    };
  }

  // Check if requested days is valid (7, 8, or 15)
  if (!ALLOWED_DAYS.includes(requestedDays as 7 | 8 | 15)) {
    return {
      valid: false,
      errorMessage: `For El Salvador vacation, you can only request 7, 8, or 15 days. You requested ${requestedDays} days.`,
      allowedDayOptions,
      existingDays,
    };
  }

  // Check annual constraints based on existing usage
  if (existingDays === 7 && requestedDays !== 8) {
    return {
      valid: false,
      errorMessage: `You already have 7 vacation days this year. To complete your 15-day annual allowance, you must request exactly 8 days.`,
      allowedDayOptions,
      existingDays,
    };
  }

  if (existingDays === 8 && requestedDays !== 7) {
    return {
      valid: false,
      errorMessage: `You already have 8 vacation days this year. To complete your 15-day annual allowance, you must request exactly 7 days.`,
      allowedDayOptions,
      existingDays,
    };
  }

  // Check if total would exceed limit
  const totalDays = existingDays + requestedDays;
  if (totalDays > MAX_ANNUAL_DAYS) {
    return {
      valid: false,
      errorMessage: `You have already used ${existingDays} vacation days this year. The maximum annual vacation allowance for El Salvador is 15 days. No additional vacation can be requested.`,
      allowedDayOptions,
      existingDays,
    };
  }

  return {
    valid: true,
    errorMessage: null,
    allowedDayOptions,
    existingDays,
  };
}
