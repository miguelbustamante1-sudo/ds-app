import type { ValidationError } from './types';

/**
 * True when the only reason validation failed is the days-before-notice policy —
 * the one failure this domain routes through exception authorization instead of
 * blocking outright.
 */
export function isOnlyDaysBeforeNoticeFailure(errors: ValidationError[]): boolean {
  return errors.length === 1 && errors[0]?.code === 'DAYS_BEFORE_NOTICE_REQUIRED';
}
