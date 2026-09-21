// src/services/timeoff/split/ValidateSplitLegPair.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSplitLegPair } from './ValidateSplitLegPair';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    timeOff: {
      findUnique: vi.fn(),
    },
  },
}));

function record(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    timeOffId: 1,
    timeOffOriginalId: null,
    statusId: 1,
    timeOffDays: 15 as unknown,
    timeOffStartDate: new Date('2026-06-01'),
    timeOffEndDate: new Date('2026-06-15'),
    teamMemberId: 501,
    ...overrides,
  };
}

describe('validateSplitLegPair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid 7+8 pair regardless of input order', async () => {
    const parent = record({ timeOffId: 10, timeOffDays: 15 });
    const legA = record({ timeOffId: 11, timeOffDays: 7, timeOffStartDate: new Date('2026-06-01'), timeOffEndDate: new Date('2026-06-07') });
    const legB = record({ timeOffId: 12, timeOffDays: 8, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 10) return Promise.resolve(parent);
      if (where.timeOffId === 11) return Promise.resolve(legA);
      if (where.timeOffId === 12) return Promise.resolve(legB);
      return Promise.resolve(null);
    });

    // Pass legB id first as legAId to confirm the function sorts chronologically itself.
    const result = await validateSplitLegPair({ parentId: 10, legAId: 12, legBId: 11 });

    expect(result.legA.timeOffId).toBe(11);
    expect(result.legB.timeOffId).toBe(12);
    expect(result.parent.timeOffId).toBe(10);
  });

  it('rejects when day totals are not 7 and 8', async () => {
    const parent = record({ timeOffId: 10, timeOffDays: 15 });
    const legA = record({ timeOffId: 11, timeOffDays: 6 });
    const legB = record({ timeOffId: 12, timeOffDays: 8 });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 10) return Promise.resolve(parent);
      if (where.timeOffId === 11) return Promise.resolve(legA);
      if (where.timeOffId === 12) return Promise.resolve(legB);
      return Promise.resolve(null);
    });

    await expect(validateSplitLegPair({ parentId: 10, legAId: 11, legBId: 12 })).rejects.toThrow(AppError);
  });

  it('rejects a leg that is already linked to another split', async () => {
    const parent = record({ timeOffId: 10, timeOffDays: 15 });
    const legA = record({ timeOffId: 11, timeOffDays: 7, timeOffOriginalId: 99 });
    const legB = record({ timeOffId: 12, timeOffDays: 8 });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 10) return Promise.resolve(parent);
      if (where.timeOffId === 11) return Promise.resolve(legA);
      if (where.timeOffId === 12) return Promise.resolve(legB);
      return Promise.resolve(null);
    });

    await expect(validateSplitLegPair({ parentId: 10, legAId: 11, legBId: 12 })).rejects.toThrow(
      'already linked to another split'
    );
  });

  it('rejects a parent that is not exactly 15 days', async () => {
    const parent = record({ timeOffId: 10, timeOffDays: 14 });
    const legA = record({ timeOffId: 11, timeOffDays: 7 });
    const legB = record({ timeOffId: 12, timeOffDays: 8 });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 10) return Promise.resolve(parent);
      if (where.timeOffId === 11) return Promise.resolve(legA);
      if (where.timeOffId === 12) return Promise.resolve(legB);
      return Promise.resolve(null);
    });

    await expect(validateSplitLegPair({ parentId: 10, legAId: 11, legBId: 12 })).rejects.toThrow(
      'must be exactly 15 days'
    );
  });

  it('rejects when the parent and legs do not all belong to the same team member', async () => {
    const parent = record({ timeOffId: 10, timeOffDays: 15, teamMemberId: 501 });
    const legA = record({ timeOffId: 11, timeOffDays: 7, teamMemberId: 501, timeOffStartDate: new Date('2026-06-01'), timeOffEndDate: new Date('2026-06-07') });
    const legB = record({ timeOffId: 12, timeOffDays: 8, teamMemberId: 999, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 10) return Promise.resolve(parent);
      if (where.timeOffId === 11) return Promise.resolve(legA);
      if (where.timeOffId === 12) return Promise.resolve(legB);
      return Promise.resolve(null);
    });

    await expect(validateSplitLegPair({ parentId: 10, legAId: 11, legBId: 12 })).rejects.toThrow(
      'same team member'
    );
  });
});
