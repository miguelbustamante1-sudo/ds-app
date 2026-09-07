import type { ValidationError } from './ValidateRequiredFields';

/**
 * Validates bonus metadata values against a subcategory's schema definition.
 * All metadata fields are optional — empty/null values are stripped.
 * Extra keys not defined in the schema are rejected.
 */
export function validateBonusMetadata(
  bonusMetadata: Record<string, unknown>,
  subcategorySchema: Record<string, string>,
): { errors: ValidationError[]; sanitized: Record<string, unknown> } {
  const errors: ValidationError[] = [];
  const sanitized: Record<string, unknown> = {};

  // Reject extra keys not in the schema
  for (const key of Object.keys(bonusMetadata)) {
    if (!(key in subcategorySchema)) {
      errors.push({ field: key, message: `Unknown metadata field: "${key}"` });
    }
  }

  // Validate each schema-defined key
  for (const [key, expectedType] of Object.entries(subcategorySchema)) {
    const value = bonusMetadata[key];

    // Skip empty values — all fields are optional
    if (value === undefined || value === null || value === '') {
      continue;
    }

    switch (expectedType) {
      case 'text':
        if (typeof value !== 'string') {
          errors.push({ field: key, message: `"${key}" must be a text value` });
        } else {
          sanitized[key] = value;
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({ field: key, message: `"${key}" must be a number` });
        } else {
          sanitized[key] = value;
        }
        break;

      case 'date':
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          errors.push({ field: key, message: `"${key}" must be a valid date string` });
        } else {
          sanitized[key] = value;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({ field: key, message: `"${key}" must be a boolean` });
        } else {
          sanitized[key] = value;
        }
        break;

      default:
        errors.push({ field: key, message: `Unknown schema type "${expectedType}" for field "${key}"` });
    }
  }

  return { errors, sanitized };
}
