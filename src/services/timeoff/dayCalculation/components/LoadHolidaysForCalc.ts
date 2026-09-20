/**
 * LoadHolidaysForCalc
 * Encapsulates loading country holidays + TM's active swaps and returning the
 * effective holiday dates (all days, not just weekdays) within [startDate, endDate].
 *
 * Used by calculateTimeOffDaysForTeamMember; calculateDays decides per-day whether
 * weekend-exclusion or holiday-exclusion applies.
 */

import { getHolidaysByCountry } from '../../../../db/holidays';
import { getActiveSwapsForTM } from '../../../holidaySwap/queries/getActiveSwapsForTM';
import type { HolidayCalcEntry } from '../types';

/**
 * Returns the effective weekday holiday dates in [startDate, endDate] after
 * applying any active holiday swaps for the team member:
 *  - The original holiday date is removed (TM works that day).
 *  - The replacement date is added as a virtual holiday (TM is off).
 *
 * All date comparisons use UTC to match the DB storage format.
 */
export async function loadHolidaysForCalc(
  teamMemberId: number,
  countryId: number,
  startDate: Date,
  endDate: Date,
): Promise<HolidayCalcEntry[]> {
  const [holidays, activeSwaps] = await Promise.all([
    getHolidaysByCountry(countryId),
    getActiveSwapsForTM(teamMemberId),
  ]);

  // Build a map of holidayId → holiday for quick lookup (used for swap half-day inheritance)
  const holidayMap = new Map(holidays.map((h) => [h.holidayId, h]));

  // Build a set of holiday IDs that have active swaps (these are removed)
  const swappedHolidayIds = new Set(activeSwaps.map((s) => s.holidayId));

  // Effective list: filter out swapped holidays, then add replacement dates
  const effectiveEntries: HolidayCalcEntry[] = [];

  for (const holiday of holidays) {
    if (!holiday.holidayIsActive) continue;
    if (swappedHolidayIds.has(holiday.holidayId)) continue; // removed by swap

    const holidayDate = new Date(holiday.holidayDate);
    const isHalfDay = holiday.holidayIsHalfDay;

    if (holiday.holidayIsRecurring) {
      // Check both years the range may span
      const yearsToCheck = new Set([
        startDate.getUTCFullYear(),
        endDate.getUTCFullYear(),
      ]);
      for (const year of yearsToCheck) {
        const effective = new Date(
          Date.UTC(year, holidayDate.getUTCMonth(), holidayDate.getUTCDate()),
        );
        if (effective >= startDate && effective <= endDate) {
          effectiveEntries.push({ date: effective, isHalfDay });
        }
      }
    } else {
      const stored = new Date(
        Date.UTC(
          holidayDate.getUTCFullYear(),
          holidayDate.getUTCMonth(),
          holidayDate.getUTCDate(),
        ),
      );
      if (stored >= startDate && stored <= endDate) {
        effectiveEntries.push({ date: stored, isHalfDay });
      }
    }
  }

  // Add replacement dates from active swaps — inherit half-day flag from the original holiday
  for (const swap of activeSwaps) {
    const repDate = new Date(swap.replacementDate);
    const replacement = new Date(
      Date.UTC(repDate.getUTCFullYear(), repDate.getUTCMonth(), repDate.getUTCDate()),
    );
    if (replacement >= startDate && replacement <= endDate) {
      const original = holidayMap.get(swap.holidayId);
      effectiveEntries.push({ date: replacement, isHalfDay: original?.holidayIsHalfDay ?? false });
    }
  }

  return effectiveEntries;
}
