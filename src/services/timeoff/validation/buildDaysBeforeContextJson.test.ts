import { describe, it, expect } from 'vitest';
import { buildDaysBeforeContextJson } from './buildDaysBeforeContextJson';
import type { ValidationError } from './types';

describe('buildDaysBeforeContextJson', () => {
  it('flattens DAYS_BEFORE_NOTICE_REQUIRED metadata into scalar context entries', () => {
    const error: ValidationError = {
      code: 'DAYS_BEFORE_NOTICE_REQUIRED',
      message: 'Policy requires notice.',
      metadata: {
        categoryName: 'Vacation',
        requiredDays: 5,
        daysUntilStart: 2,
        earliestValidDate: new Date('2026-10-01T00:00:00.000Z'),
      },
    };

    expect(buildDaysBeforeContextJson([error])).toEqual([
      { key: 'daysBeforeCategoryName', value: 'Vacation' },
      { key: 'daysBeforeRequiredDays', value: 5 },
      { key: 'daysBeforeDaysUntilStart', value: 2 },
      { key: 'daysBeforeEarliestValidDate', value: '2026-10-01T00:00:00.000Z' },
    ]);
  });

  it('throws when called with an empty errors array', () => {
    expect(() => buildDaysBeforeContextJson([])).toThrow('buildDaysBeforeContextJson called with no validation errors');
  });
});
