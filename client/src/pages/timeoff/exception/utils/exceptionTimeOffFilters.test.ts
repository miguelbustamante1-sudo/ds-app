import { describe, it, expect } from 'vitest';
import {
  isPastTimeOff,
  isExcludedStatus,
  filterVisibleForOptions,
  EXCLUDED_STATUS_IDS,
} from './exceptionTimeOffFilters';

describe('isPastTimeOff', () => {
  const reference = new Date(2026, 8, 24); // 2026-09-24, local midnight

  it('returns true when end date is before the reference day', () => {
    expect(isPastTimeOff('2026-09-23T00:00:00.000Z', reference)).toBe(true);
  });

  it('returns false when end date is the same day as the reference day', () => {
    expect(isPastTimeOff('2026-09-24T00:00:00.000Z', reference)).toBe(false);
  });

  it('returns false when end date is after the reference day', () => {
    expect(isPastTimeOff('2026-09-25T00:00:00.000Z', reference)).toBe(false);
  });
});

describe('isExcludedStatus', () => {
  it('returns true for Cancelled (4), Rejected (5), and Split (6)', () => {
    expect(isExcludedStatus(4)).toBe(true);
    expect(isExcludedStatus(5)).toBe(true);
    expect(isExcludedStatus(6)).toBe(true);
  });

  it('returns false for other known statuses', () => {
    expect(isExcludedStatus(1)).toBe(false); // Tentative
    expect(isExcludedStatus(2)).toBe(false); // Acknowledged/Approved
    expect(isExcludedStatus(3)).toBe(false); // Taken
  });

  it('returns false for null', () => {
    expect(isExcludedStatus(null)).toBe(false);
  });
});

describe('filterVisibleForOptions', () => {
  const reference = new Date(2026, 8, 24);
  const records = [
    { id: 1, timeOffEndDate: '2026-09-20T00:00:00.000Z', statusId: 1 }, // past, Tentative
    { id: 2, timeOffEndDate: '2026-09-30T00:00:00.000Z', statusId: 4 }, // future, Cancelled
    { id: 3, timeOffEndDate: '2026-09-30T00:00:00.000Z', statusId: 2 }, // future, Approved
  ];

  it('excludes past and cancelled-ish records by default', () => {
    const result = filterVisibleForOptions(records, false, false, reference);
    expect(result.map((r) => r.id)).toEqual([3]);
  });

  it('includes past records when showPast is true', () => {
    const result = filterVisibleForOptions(records, true, false, reference);
    expect(result.map((r) => r.id)).toEqual([1, 3]);
  });

  it('includes cancelled-ish records when showCancelled is true', () => {
    const result = filterVisibleForOptions(records, false, true, reference);
    expect(result.map((r) => r.id)).toEqual([2, 3]);
  });

  it('includes everything when both toggles are true', () => {
    const result = filterVisibleForOptions(records, true, true, reference);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('EXCLUDED_STATUS_IDS', () => {
  it('is exactly [4, 5, 6]', () => {
    expect(EXCLUDED_STATUS_IDS).toEqual([4, 5, 6]);
  });
});
