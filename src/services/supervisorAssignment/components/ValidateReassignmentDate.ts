/**
 * Reassignment Date Validation Component
 * Ensures a new supervisor assignment's start date is strictly after the
 * start date of any open-ended assignment it will auto-close
 */

import { AppError } from '../../../errors/AppError';
import type { SupervisorAssignmentDTO } from '@shared/dto/SupervisorAssignment';

export class InvalidReassignmentDateError extends AppError {
  constructor(existingStartDate: Date) {
    super(
      `New assignment start date must be strictly after the existing open-ended assignment's start date (${existingStartDate.toISOString().slice(0, 10)})`,
      400,
    );
    this.name = 'InvalidReassignmentDateError';
  }
}

export function validateReassignmentDate(
  newStartDate: Date,
  existingAssignment: SupervisorAssignmentDTO,
): void {
  if (newStartDate.getTime() <= existingAssignment.supervisorAssignmentStartDate.getTime()) {
    throw new InvalidReassignmentDateError(existingAssignment.supervisorAssignmentStartDate);
  }
}
