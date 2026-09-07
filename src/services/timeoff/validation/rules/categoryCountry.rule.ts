/**
 * FR-3: Category-Country Validation
 * Validates that the selected category is enabled for the team member's country
 */

import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateCategoryCountry(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  // effectiveCountryId is resolved in dataLoader (defaults to GT = 2 if null)
  const effectiveCountryId = context.effectiveCountryId;

  // Check if category is allowed for country
  if (!context.allowedCategoryIds.includes(input.categoryId)) {
    return {
      valid: false,
      error: TimeOffValidationErrors.CATEGORY_NOT_ALLOWED(input.categoryId, effectiveCountryId),
    };
  }

  return { valid: true };
}
