import { AppError } from '../../../errors/AppError';
import type { BonusExternalEntryDTO } from '@shared/dto';

export function validateBonusEntries(entries: BonusExternalEntryDTO[]): void {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError('entries must be a non-empty array', 400);
  }

  entries.forEach((entry, index) => {
    if (typeof entry.workdayId !== 'string' || !entry.workdayId.trim()) {
      throw new AppError(`entries[${index}].workdayId is required`, 400);
    }
    if (typeof entry.bonusType !== 'string' || !entry.bonusType.trim()) {
      throw new AppError(`entries[${index}].bonusType is required`, 400);
    }
    if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount <= 0) {
      throw new AppError(`entries[${index}].amount must be a positive number`, 400);
    }
    if (!Number.isInteger(entry.month) || entry.month < 1 || entry.month > 12) {
      throw new AppError(`entries[${index}].month must be an integer between 1 and 12`, 400);
    }
    if (!Number.isInteger(entry.year) || entry.year < 2000 || entry.year > 2100) {
      throw new AppError(`entries[${index}].year must be a valid year`, 400);
    }
  });
}
