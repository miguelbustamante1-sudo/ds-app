// src/services/timeoff/split/SyncSplitParentStartDate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSplitLegOrdering, syncSplitParentStartDate } from './SyncSplitParentStartDate';
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
  },
}));

vi.mock('../changelog', () => ({
  fetchRawTimeOffRow: vi.fn(),
  createTimeOffChangeLog: vi.fn(),
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

function record(overrides: Partial<Record<string, unknown>>) {
  return {
    timeOffId: 1,
    timeOffOriginalId: null,
    statusId: 1,
    timeOffStartDate: new Date('2026-06-01'),
    timeOffEndDate: new Date('2026-06-08'),
    ...overrides,
  };
}

describe('validateSplitLegOrdering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no-ops for a record that is not a split leg', async () => {
    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      record({ timeOffId: 1, timeOffOriginalId: null })
    );
    await expect(
      validateSplitLegOrdering({ editedTimeOffId: 1, newStartDate: new Date('2026-06-01'), newEndDate: new Date('2026-06-08') })
    ).resolves.toBeUndefined();
  });

  it('rejects an edit that would put leg 1 on/after leg 2', async () => {
    const legA = record({ timeOffId: 1, timeOffOriginalId: 100 });
    const legB = record({ timeOffId: 2, timeOffOriginalId: 100, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(legA);
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(legB);

    await expect(
      validateSplitLegOrdering({ editedTimeOffId: 1, newStartDate: new Date('2026-06-01'), newEndDate: new Date('2026-06-12') })
    ).rejects.toThrow(AppError);
  });

  it('accepts an edit that preserves ordering', async () => {
    const legA = record({ timeOffId: 1, timeOffOriginalId: 100 });
    const legB = record({ timeOffId: 2, timeOffOriginalId: 100, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(legA);
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(legB);

    await expect(
      validateSplitLegOrdering({ editedTimeOffId: 1, newStartDate: new Date('2026-06-02'), newEndDate: new Date('2026-06-09') })
    ).resolves.toBeUndefined();
  });
});

describe('syncSplitParentStartDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchRawTimeOffRow as ReturnType<typeof vi.fn>).mockResolvedValue({ tto_id: 100 });
  });

  it('syncs the parent start date when leg 1 start date changes', async () => {
    const legA = record({ timeOffId: 1, timeOffOriginalId: 100 });
    const legB = record({ timeOffId: 2, timeOffOriginalId: 100, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });
    const parent = record({ timeOffId: 100, timeOffOriginalId: null, statusId: 6, timeOffStartDate: new Date('2026-06-01'), timeOffEndDate: new Date('2026-06-17') });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 1) return Promise.resolve(legA);
      if (where.timeOffId === 100) return Promise.resolve(parent);
      return Promise.resolve(null);
    });
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(legB);

    await syncSplitParentStartDate({
      editedTimeOffId: 1,
      newStartDate: new Date('2026-06-02'),
      newEndDate: new Date('2026-06-09'),
      editedByUserId: 1,
      editedByEmail: 'a@b.com',
    });

    expect(prisma.timeOff.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { timeOffId: 100 },
        data: expect.objectContaining({ timeOffStartDate: new Date('2026-06-02') }),
      })
    );
    expect(createTimeOffChangeLog).toHaveBeenCalledTimes(1);
    expect(auditOrchestrator.log).toHaveBeenCalledTimes(1);
  });

  it('does not touch the parent when leg 2 is edited', async () => {
    const legB = record({ timeOffId: 2, timeOffOriginalId: 100, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });
    const legA = record({ timeOffId: 1, timeOffOriginalId: 100 });

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(legB);
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(legA);

    await syncSplitParentStartDate({
      editedTimeOffId: 2,
      newStartDate: new Date('2026-06-11'),
      newEndDate: new Date('2026-06-18'),
      editedByUserId: 1,
      editedByEmail: 'a@b.com',
    });

    expect(prisma.timeOff.update).not.toHaveBeenCalled();
  });

  it('does not touch a parent that is no longer statusId Split', async () => {
    const legA = record({ timeOffId: 1, timeOffOriginalId: 100 });
    const legB = record({ timeOffId: 2, timeOffOriginalId: 100, timeOffStartDate: new Date('2026-06-10'), timeOffEndDate: new Date('2026-06-17') });
    const parent = record({ timeOffId: 100, timeOffOriginalId: null, statusId: 4 }); // Cancelled

    (prisma.timeOff.findUnique as ReturnType<typeof vi.fn>).mockImplementation(({ where }: { where: { timeOffId: number } }) => {
      if (where.timeOffId === 1) return Promise.resolve(legA);
      if (where.timeOffId === 100) return Promise.resolve(parent);
      return Promise.resolve(null);
    });
    (prisma.timeOff.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(legB);

    await syncSplitParentStartDate({
      editedTimeOffId: 1,
      newStartDate: new Date('2026-06-02'),
      newEndDate: new Date('2026-06-09'),
      editedByUserId: 1,
      editedByEmail: 'a@b.com',
    });

    expect(prisma.timeOff.update).not.toHaveBeenCalled();
  });
});
