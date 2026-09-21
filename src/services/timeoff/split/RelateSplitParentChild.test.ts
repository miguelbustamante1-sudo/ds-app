// src/services/timeoff/split/RelateSplitParentChild.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { relateSplitParentChild } from './RelateSplitParentChild';
import { validateSplitLegPair } from './ValidateSplitLegPair';
import { prisma } from '../../../db/prisma';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

vi.mock('./ValidateSplitLegPair', () => ({
  validateSplitLegPair: vi.fn(),
}));

vi.mock('../../../db/prisma', () => ({
  prisma: {
    timeOff: { update: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));

vi.mock('../changelog', () => ({
  fetchRawTimeOffRow: vi.fn(),
  createTimeOffChangeLog: vi.fn(),
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

describe('relateSplitParentChild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchRawTimeOffRow as ReturnType<typeof vi.fn>).mockResolvedValue({ tto_id: 1 });
    (validateSplitLegPair as ReturnType<typeof vi.fn>).mockResolvedValue({
      parent: { timeOffId: 10, timeOffDays: 15 },
      legA: { timeOffId: 11, timeOffDays: 7, timeOffStartDate: new Date('2026-06-01'), timeOffEndDate: new Date('2026-06-07') },
      legB: { timeOffId: 12, timeOffDays: 8, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') },
    });
  });

  it('sets timeOffOriginalId on both legs, flips parent status to Split, and syncs parent start date', async () => {
    const result = await relateSplitParentChild({
      parentId: 10,
      legAId: 11,
      legBId: 12,
      relatedByUserId: 1,
      relatedByEmail: 'a@b.com',
    });

    expect(result).toEqual({ parentId: 10, legAId: 11, legBId: 12 });
    expect(prisma.timeOff.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { timeOffId: 10 },
        data: expect.objectContaining({ statusId: 6, timeOffStartDate: new Date('2026-06-01') }),
      })
    );
    expect(prisma.timeOff.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { timeOffId: 11 }, data: expect.objectContaining({ timeOffOriginalId: 10 }) })
    );
    expect(prisma.timeOff.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { timeOffId: 12 }, data: expect.objectContaining({ timeOffOriginalId: 10 }) })
    );
    expect(createTimeOffChangeLog).toHaveBeenCalledTimes(3);
    expect(auditOrchestrator.log).toHaveBeenCalledTimes(3);
  });

  it('propagates a validation rejection without writing anything', async () => {
    const { AppError } = await import('../../../errors/AppError');
    (validateSplitLegPair as ReturnType<typeof vi.fn>).mockRejectedValue(new AppError('invalid pair', 400));

    await expect(
      relateSplitParentChild({ parentId: 10, legAId: 11, legBId: 12, relatedByUserId: 1, relatedByEmail: 'a@b.com' })
    ).rejects.toThrow('invalid pair');

    expect(prisma.timeOff.update).not.toHaveBeenCalled();
  });
});
