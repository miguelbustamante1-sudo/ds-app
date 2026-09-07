import { AppError } from '../../../errors/AppError';
import type { AuthorizerAssignmentDTO } from '@shared/dto/AuthorizerAssignment';

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
  existingAssignment: AuthorizerAssignmentDTO,
): void {
  if (newStartDate.getTime() <= existingAssignment.authorizerAssignmentStartDate.getTime()) {
    throw new InvalidReassignmentDateError(existingAssignment.authorizerAssignmentStartDate);
  }
}
