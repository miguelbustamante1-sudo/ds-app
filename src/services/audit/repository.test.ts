// src/services/audit/repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getByEntity } from './repository';
import { prisma } from '../../db/prisma';

vi.mock('../../db/prisma', () => ({
  prisma: {
    audit: {
      findMany: vi.fn(),
    },
  },
}));

describe('getByEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries by entityName/entityId ordered newest-first', async () => {
    const rows = [{ id: '1', entityName: 'hsw_holiday_swap', entityId: '42' }];
    (prisma.audit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

    const result = await getByEntity('hsw_holiday_swap', '42');

    expect(prisma.audit.findMany).toHaveBeenCalledWith({
      where: { entityName: 'hsw_holiday_swap', entityId: '42' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toBe(rows);
  });
});
