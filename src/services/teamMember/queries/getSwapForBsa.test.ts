// src/services/teamMember/queries/getSwapForBsa.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getSwapForBsa } from './getSwapForBsa';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getSwapForBsa', () => {
  it('maps a found swap to HolidaySwapDTO', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      holidaySwapId: 42,
      teamMemberId: 7,
      holidayId: 3,
      holiday: { holidayName: 'New Year' },
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-01-05'),
      statusId: 2,
      status: { statusName: 'Approved' },
      active: true,
      createdBy: 'user@example.com',
      createdAt: new Date('2025-12-01'),
    });

    const result = await getSwapForBsa(42);

    expect(result).toEqual({
      holidaySwapId: 42,
      teamMemberId: 7,
      holidayId: 3,
      holidayName: 'New Year',
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-01-05'),
      statusId: 2,
      statusName: 'Approved',
      active: true,
      createdBy: 'user@example.com',
      createdAt: new Date('2025-12-01'),
    });
  });

  it('returns null when the swap does not exist', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getSwapForBsa(999)).toBeNull();
  });
});
