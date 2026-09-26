import type { ValidationError } from './types';

export interface WorkflowContextEntry {
  key: string;
  value: string | number | boolean;
}

interface DaysBeforeMetadata {
  categoryName: string;
  requiredDays: number;
  daysUntilStart: number;
  earliestValidDate: Date;
}

/**
 * Builds the workflow-instance context entries that surface a days-before
 * notice violation's specifics (required notice, days actually given at
 * submission, earliest valid date) in the generic task drawer.
 *
 * Captured once at submission time — daysUntilStart is only meaningful
 * relative to when the request was submitted, not when it's later reviewed,
 * so this must be called with the errors produced during that submission's
 * own validateTimeOff call, not recomputed later.
 *
 * Takes the full errors array rather than a single error because callers
 * only call this after isOnlyDaysBeforeNoticeFailure(errors) has confirmed
 * exactly one error with code DAYS_BEFORE_NOTICE_REQUIRED — checked here at
 * runtime rather than asserted, so a misuse fails loudly instead of silently.
 */
export function buildDaysBeforeContextJson(errors: ValidationError[]): WorkflowContextEntry[] {
  const error = errors[0];
  if (!error) {
    throw new Error('buildDaysBeforeContextJson called with no validation errors');
  }
  const metadata = error.metadata as unknown as DaysBeforeMetadata;
  return [
    { key: 'daysBeforeCategoryName', value: metadata.categoryName },
    { key: 'daysBeforeRequiredDays', value: metadata.requiredDays },
    { key: 'daysBeforeDaysUntilStart', value: metadata.daysUntilStart },
    { key: 'daysBeforeEarliestValidDate', value: metadata.earliestValidDate.toISOString() },
  ];
}
