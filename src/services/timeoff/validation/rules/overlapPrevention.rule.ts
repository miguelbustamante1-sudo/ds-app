/**
 * FR-4: Overlap Prevention Validation
 * Validates that the new time off does not overlap with existing requests
 */

import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateNoOverlap(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  const conflicts = context.overlappingTimeOffs
    // Exclude self for updates (FR-5)
    .filter((existing) => existing.timeOffId !== input.timeOffId)
    // Only blocking statuses (excludes Cancelled)
    .filter(
      (existing) =>
        existing.statusId === null || context.blockingStatusIds.includes(existing.statusId)
    )
    // Check overlap: existing.start <= new.end AND existing.end >= new.start
    .filter((existing) => {
      const existingStart = new Date(existing.timeOffStartDate);
      const existingEnd = new Date(existing.timeOffEndDate);
      const newStart = new Date(input.timeOffStartDate);
      const newEnd = new Date(input.timeOffEndDate);

      return existingStart <= newEnd && existingEnd >= newStart;
    });

  if (conflicts.length > 0) {
    return {
      valid: false,
      error: TimeOffValidationErrors.OVERLAP_DETECTED(
        conflicts.map((c) => ({
          timeOffId: c.timeOffId,
          startDate: c.timeOffStartDate,
          endDate: c.timeOffEndDate,
        }))
      ),
    };
  }

  return { valid: true };
}
