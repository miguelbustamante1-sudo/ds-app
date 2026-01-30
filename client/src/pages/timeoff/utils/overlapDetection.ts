import type { TimeOffWithDetailsDTO } from '../../../../../shared/dto/TimeOff';
import { parseUTCDateAsLocal } from '@/lib/utils';

/**
 * Detects overlapping time off requests.
 * Overlap occurs when: newStart <= existingEnd AND newEnd >= existingStart
 * Excludes cancelled time offs from consideration.
 *
 * @param newStart - Start date of the new time off request
 * @param newEnd - End date of the new time off request
 * @param existingTimeOffs - List of existing time off requests to check against
 * @param cancelledStatusId - Status ID for cancelled time offs (fetched from API)
 */
export function detectOverlap(
  newStart: Date,
  newEnd: Date,
  existingTimeOffs: TimeOffWithDetailsDTO[],
  cancelledStatusId: number
): TimeOffWithDetailsDTO[] {
  return existingTimeOffs.filter((existing) => {
    // Skip cancelled time offs
    if (existing.statusId === cancelledStatusId) {
      return false;
    }

    // Parse UTC dates as local to match the calendar dates
    const existingStart = parseUTCDateAsLocal(existing.timeOffStartDate);
    const existingEnd = parseUTCDateAsLocal(existing.timeOffEndDate);

    // Check for overlap: ranges overlap if one starts before the other ends
    return newStart <= existingEnd && newEnd >= existingStart;
  });
}
