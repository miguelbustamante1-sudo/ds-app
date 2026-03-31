/**
 * Max Days Per Request Validation Rule
 * Enforces the per-category, per-country maximum days limit configured on a
 * CategoryCountry record (ttc_max_days / categoryCountryMaxDays).
 *
 * Business Rule:
 * - When categoryCountryMaxDays > 0, no single request may exceed that value.
 * - When categoryCountryMaxDays = 0 the rule is disabled for that category.
 */

import type { TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateMaxDays(
  totalDays: number,
  context: TimeOffValidationContext
): ValidationResult {
  const { categoryCountryMaxDays, categoryName } = context;

  if (categoryCountryMaxDays <= 0) return { valid: true };

  if (totalDays > categoryCountryMaxDays) {
    return {
      valid: false,
      error: TimeOffValidationErrors.EXCEEDS_MAX_DAYS(categoryName, totalDays, categoryCountryMaxDays),
    };
  }

  return { valid: true };
}
