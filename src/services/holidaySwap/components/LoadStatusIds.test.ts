import { describe, it, expect, vi } from 'vitest';
import { loadStatusIds } from './LoadStatusIds';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    timeOffStatus: {
      findMany: vi.fn(),
    },
  },
}));

describe('loadStatusIds', () => {
  it('resolves pendingAuth to the InAuth status id', async () => {
    (prisma.timeOffStatus.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { statusId: 1, statusName: 'Tentative' },
      { statusId: 2, statusName: 'Acknowledged' },
      { statusId: 3, statusName: 'Taken' },
      { statusId: 4, statusName: 'Cancelled' },
      { statusId: 5, statusName: 'Rejected' },
      { statusId: 7, statusName: 'InAuth' },
    ]);

    const result = await loadStatusIds();

    expect(result.pendingAuth).toBe(7);
    expect(result.pending).toBe(1);
    expect(result.approved).toBe(2);
    expect(result.taken).toBe(3);
    expect(result.cancelled).toBe(4);
    expect(result.rejected).toBe(5);
  });

  it('throws when InAuth is not seeded', async () => {
    (prisma.timeOffStatus.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { statusId: 1, statusName: 'Tentative' },
      { statusId: 2, statusName: 'Acknowledged' },
      { statusId: 3, statusName: 'Taken' },
      { statusId: 4, statusName: 'Cancelled' },
      { statusId: 5, statusName: 'Rejected' },
    ]);

    await expect(loadStatusIds()).rejects.toThrow("Required TimeOffStatus 'InAuth' not found in database");
  });
});
