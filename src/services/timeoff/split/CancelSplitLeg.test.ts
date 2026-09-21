// src/services/timeoff/split/CancelSplitLeg.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelSplitLeg } from './CancelSplitLeg';
import { prisma } from '../../../db/prisma';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    timeOff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
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

const TODAY = new Date();
const FUTURE = new Date(TODAY.getTime() + 30 * 86_400_000);
const PAST = new Date(TODAY.getTime() - 30 * 86_400_000);

function leg(overrides: Partial<Record<string, unknown>>) {
  return {
    timeOffId: 1,
    timeOffOriginalId: 100,
    statusId: 1,
    timeOffStartDate: FUTURE,
    timeOffEndDate: FUTURE,
    ...overrides,
  };
}

describe('cancelSplitLeg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchRawTimeOffRow as ReturnType<typeof vi.fn>).mockResolvedValue({ tto_id: 1 });
  });

  it('blocks cancellation when the sibling has already passed (by end date)', async () => {
    const target = leg({ timeOffId: 1, timeOffOriginalId: 100 });
    const sibling = leg({ timeOffId: 2, timeOffOriginalId: 100, timeOffEndDate: PAST });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 1) return Promise.resolve(target);
      if (where.timeOffId === 100) return Promise.resolve(leg({ timeOffId: 100, timeOffOriginalId: null, statusId: 6 }));
      return Promise.resolve(null);
    });
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sibling);

    await expect(
      cancelSplitLeg({ timeOffId: 1, cancelledStatusId: 4, comment: 'test', cancelledByUserId: 1, cancelledByEmail: 'a@b.com' })
    ).rejects.toThrow('already passed');

    expect(prisma.timeOff.update).not.toHaveBeenCalled();
  });

  it('blocks cancellation when the sibling status is Taken (3)', async () => {
    const target = leg({ timeOffId: 1, timeOffOriginalId: 100 });
    const sibling = leg({ timeOffId: 2, timeOffOriginalId: 100, statusId: 3, timeOffEndDate: FUTURE });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 1) return Promise.resolve(target);
      if (where.timeOffId === 100) return Promise.resolve(leg({ timeOffId: 100, timeOffOriginalId: null, statusId: 6 }));
      return Promise.resolve(null);
    });
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sibling);

    await expect(
      cancelSplitLeg({ timeOffId: 1, cancelledStatusId: 4, comment: 'test', cancelledByUserId: 1, cancelledByEmail: 'a@b.com' })
    ).rejects.toThrow(AppError);
  });

  it('cascades to cancel target, sibling, and parent when the sibling is still future', async () => {
    const target = leg({ timeOffId: 1, timeOffOriginalId: 100 });
    const sibling = leg({ timeOffId: 2, timeOffOriginalId: 100, timeOffEndDate: FUTURE });
    const parent = leg({ timeOffId: 100, timeOffOriginalId: null, statusId: 6 });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 1) return Promise.resolve(target);
      if (where.timeOffId === 100) return Promise.resolve(parent);
      return Promise.resolve(null);
    });
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sibling);

    const result = await cancelSplitLeg({
      timeOffId: 1,
      cancelledStatusId: 4,
      comment: 'cancel leg 1',
      cancelledByUserId: 1,
      cancelledByEmail: 'a@b.com',
    });

    expect(result.cascaded).toBe(true);
    expect(result.cancelledIds.sort((a, b) => a - b)).toEqual([1, 2, 100]);
    expect(prisma.timeOff.update).toHaveBeenCalledTimes(3);
    expect(createTimeOffChangeLog).toHaveBeenCalledTimes(3);
    expect(auditOrchestrator.log).toHaveBeenCalledTimes(3);
  });

  it('throws when called on a record that is not a split leg', async () => {
    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      leg({ timeOffId: 5, timeOffOriginalId: null })
    );

    await expect(
      cancelSplitLeg({ timeOffId: 5, cancelledStatusId: 4, comment: 'x', cancelledByUserId: 1, cancelledByEmail: 'a@b.com' })
    ).rejects.toThrow('not a split leg');
  });
});
