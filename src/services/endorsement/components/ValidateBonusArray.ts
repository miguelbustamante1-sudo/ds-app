import type { CreateEndorsementBonusInput } from '@shared/dto';
import type { ValidationError } from './ValidateRequiredFields';

/**
 * Validates the structural integrity of the bonuses array.
 * Does NOT verify that bonusSubcategoryId exists in the database.
 */
export function validateBonusArray(bonuses: CreateEndorsementBonusInput[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<number>();

  for (let i = 0; i < bonuses.length; i++) {
    const bonus = bonuses[i]!;

    // Validate bonusSubcategoryId is a positive integer
    if (!Number.isInteger(bonus.bonusSubcategoryId) || bonus.bonusSubcategoryId <= 0) {
      errors.push({
        field: `bonuses[${i}].bonusSubcategoryId`,
        message: 'bonusSubcategoryId must be a positive integer',
      });
    }

    // Check for duplicate bonusSubcategoryId
    if (seenIds.has(bonus.bonusSubcategoryId)) {
      errors.push({
        field: `bonuses[${i}].bonusSubcategoryId`,
        message: `Duplicate bonusSubcategoryId: ${bonus.bonusSubcategoryId}`,
      });
    }
    seenIds.add(bonus.bonusSubcategoryId);

    // Validate endorsementBonusAmount when provided
    if (bonus.endorsementBonusAmount !== null && bonus.endorsementBonusAmount !== undefined) {
      if (typeof bonus.endorsementBonusAmount !== 'number' || bonus.endorsementBonusAmount <= 0) {
        errors.push({
          field: `bonuses[${i}].endorsementBonusAmount`,
          message: 'endorsementBonusAmount must be a positive number',
        });
      }
    }
  }

  return errors;
}
