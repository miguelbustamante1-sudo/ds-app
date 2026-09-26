import { describe, it, expect, vi } from 'vitest';
import { getSwapSubjectTeamMember } from './GetSwapSubjectTeamMember';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getSwapSubjectTeamMember', () => {
  it('returns null for a non-numeric id', async () => {
    expect(await getSwapSubjectTeamMember('not-a-number')).toBeNull();
  });

  it('returns null when the swap does not exist', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getSwapSubjectTeamMember('42')).toBeNull();
  });

  it('returns the swap teamMemberId', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ teamMemberId: 468 });
    expect(await getSwapSubjectTeamMember('34')).toBe(468);
  });
});
