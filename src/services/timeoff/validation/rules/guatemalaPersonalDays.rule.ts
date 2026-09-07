/**
 * Guatemala Personal Days Monthly Limit Rule
 *
 * A team member in Guatemala may take at most 2 Personal Days per calendar month,
 * cumulative across all their (non-cancelled, non-rejected) Personal Day requests
 * whose start date falls in that month.
 */

import type { ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export interface GuatemalaPersonalDaysContext {
  isGuatemalaPersonalDay: boolean;
  requestedDays: number;
  usedPersonalDaysInMonth: number;
  monthStart: Date;
  monthEnd: Date;
}

const MAX_PERSONAL_DAYS_PER_MONTH = 2;

export function validateGuatemalaPersonalDays(
  context: GuatemalaPersonalDaysContext | null
): ValidationResult {
  if (!context || !context.isGuatemalaPersonalDay) {
    return { valid: true };
  }

  const { requestedDays, usedPersonalDaysInMonth, monthStart, monthEnd } = context;

  if (usedPersonalDaysInMonth + requestedDays > MAX_PERSONAL_DAYS_PER_MONTH) {
    return {
      valid: false,
      error: TimeOffValidationErrors.GT_PERSONAL_DAYS_MONTHLY_LIMIT_REACHED(
        usedPersonalDaysInMonth,
        requestedDays,
        monthStart,
        monthEnd
      ),
    };
  }

  return { valid: true };
}
