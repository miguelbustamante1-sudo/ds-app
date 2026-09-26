import { describe, it, expect, vi } from 'vitest';
import { getSwapTaskSummary } from './GetSwapTaskSummary';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getSwapTaskSummary', () => {
  it('returns null for a non-numeric id', async () => {
    expect(await getSwapTaskSummary('not-a-number')).toBeNull();
  });

  it('returns null when the swap does not exist', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getSwapTaskSummary('42')).toBeNull();
  });

  it('describes a past-holiday exception and links to the swap detail page', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      holidaySwapId: 34,
      teamMember: { teamMemberNames: 'Miguel Alfonso', teamMemberSurnames: 'Bustamante' },
      holiday: { holidayName: "New Year's Day" },
      originalDate: new Date('2025-01-01'),
    });

    const result = await getSwapTaskSummary('34');

    expect(result).toEqual({
      url: '/holiday-swaps/34',
      summary: "Miguel Alfonso Bustamante — New Year's Day swap exception: holiday date has already passed",
    });
  });

  it('falls back to a generic label when the original date is not in the past', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      holidaySwapId: 35,
      teamMember: { teamMemberNames: 'Jane', teamMemberSurnames: 'Doe' },
      holiday: { holidayName: 'Some Holiday' },
      originalDate: future,
    });

    const result = await getSwapTaskSummary('35');

    expect(result?.summary).toBe('Jane Doe — Some Holiday swap exception: exception pending review');
  });
});
