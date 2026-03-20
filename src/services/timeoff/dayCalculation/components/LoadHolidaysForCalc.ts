/**
 * LoadHolidaysForCalc
 * Encapsulates loading country holidays + TM's active swaps and returning the
 * effective weekday-only holiday dates within [startDate, endDate].
 *
 * Used exclusively by calculateTimeOffDaysForTeamMember to ensure the
 * workdays strategy deducts holidays (including swap substitutions).
 */

import { getHolidaysByCountry } from '../../../../db/holidays';
import { getActiveSwapsForTM } from '../../../holidaySwap/queries/getActiveSwapsForTM';

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
): Promise<Date[]> {
  const [holidays, activeSwaps] = await Promise.all([
    getHolidaysByCountry(countryId),
    getActiveSwapsForTM(teamMemberId),
  ]);

  // Build a set of holiday IDs that have active swaps (these are removed)
  const swappedHolidayIds = new Set(activeSwaps.map((s) => s.holidayId));

  // Effective list: filter out swapped holidays, then add replacement dates
  const effectiveDates: Date[] = [];

  for (const holiday of holidays) {
    if (!holiday.holidayIsActive) continue;
    if (swappedHolidayIds.has(holiday.holidayId)) continue; // removed by swap

    const holidayDate = new Date(holiday.holidayDate);

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
          effectiveDates.push(effective);
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
        effectiveDates.push(stored);
      }
    }
  }

  // Add replacement dates from active swaps
  for (const swap of activeSwaps) {
    const repDate = new Date(swap.replacementDate);
    const replacement = new Date(
      Date.UTC(repDate.getUTCFullYear(), repDate.getUTCMonth(), repDate.getUTCDate()),
    );
    if (replacement >= startDate && replacement <= endDate) {
      effectiveDates.push(replacement);
    }
  }

  // Filter to weekdays only (Mon–Fri in UTC)
  return effectiveDates.filter((d) => {
    const dow = d.getUTCDay();
    return dow >= 1 && dow <= 5;
  });
}
