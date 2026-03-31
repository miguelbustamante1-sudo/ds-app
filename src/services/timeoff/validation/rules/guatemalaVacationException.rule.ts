/**
 * Guatemala Vacation Exception Rule
 *
 * A vacation request with fewer than 5 workdays is an "exception".
 * A team member may use at most 5 exception days per anniversary year.
 */

import type { ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export interface GuatemalaVacationExceptionContext {
  isGuatemalaVacation: boolean;
  requestedDays: number;
  usedExceptionDaysInWindow: number;
  anniversaryYearStart: Date;
  anniversaryYearEnd: Date;
}

const EXCEPTION_THRESHOLD = 5; // days < 5 are exceptions
const MAX_EXCEPTION_DAYS = 5;  // total exception days allowed per anniversary year

export function validateGuatemalaVacationException(
  context: GuatemalaVacationExceptionContext | null
): ValidationResult {
  if (!context || !context.isGuatemalaVacation) {
    return { valid: true };
  }

  const { requestedDays, usedExceptionDaysInWindow, anniversaryYearStart, anniversaryYearEnd } = context;

  // >= 5 days is not an exception — skip
  if (requestedDays >= EXCEPTION_THRESHOLD) {
    return { valid: true };
  }

  if (usedExceptionDaysInWindow + requestedDays > MAX_EXCEPTION_DAYS) {
    return {
      valid: false,
      error: TimeOffValidationErrors.GT_VACATION_EXCEPTION_LIMIT_REACHED(
        usedExceptionDaysInWindow,
        requestedDays,
        anniversaryYearStart,
        anniversaryYearEnd
      ),
    };
  }

  return { valid: true };
}
