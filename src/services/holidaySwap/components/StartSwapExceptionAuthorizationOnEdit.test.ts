import { describe, it, expect, vi } from 'vitest';
import { startSwapExceptionAuthorizationOnEdit } from './StartSwapExceptionAuthorizationOnEdit';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import * as loadStatusIdsModule from './LoadStatusIds';
import * as instantiateModule from './InstantiateSwapExceptionAuthorizationWorkflow';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      update: vi.fn(),
    },
  },
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: {
    log: vi.fn(),
  },
}));

describe('startSwapExceptionAuthorizationOnEdit', () => {
  it('updates the swap to InAuth/inactive, audits with the before snapshot, and instantiates the workflow', async () => {
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    const updatedRow = {
      holidaySwapId: 200,
      teamMemberId: 11,
      holidayId: 4,
      statusId: 7,
      originalDate: new Date('2026-02-01'),
      replacementDate: new Date('2026-07-01'),
      active: false,
      status: { statusName: 'InAuth' },
    };
    (prisma.holidaySwap.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedRow);
    vi.spyOn(instantiateModule, 'instantiateSwapExceptionAuthorizationWorkflow').mockResolvedValue(false);

    const before = { holidaySwapId: 200, statusId: 1, holidayId: 9 };

    const result = await startSwapExceptionAuthorizationOnEdit({
      holidaySwapId: 200,
      before,
      holidayId: 4,
      originalDate: new Date('2026-02-01'),
      replacementDate: new Date('2026-07-01'),
      updatedBy: 'supervisor@example.com',
      requestedByUserId: 66,
      reasonComment: 'the original holiday date has already passed',
    });

    expect(prisma.holidaySwap.update).toHaveBeenCalledWith({
      where: { holidaySwapId: 200 },
      data: expect.objectContaining({
        holidayId: 4,
        statusId: 7,
        active: false,
        updatedBy: 'supervisor@example.com',
      }),
      include: { status: { select: { statusName: true } } },
    });
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'hsw_holiday_swap',
        entityId: '200',
        oldValues: before,
        comment: 'Holiday swap updated and saved pending exception authorization (the original holiday date has already passed)',
      }),
    );
    expect(instantiateModule.instantiateSwapExceptionAuthorizationWorkflow).toHaveBeenCalledWith({
      holidaySwapId: 200,
      requestedByUserId: 66,
      requestedByEmail: 'supervisor@example.com',
    });
    expect(result).toEqual({ updated: updatedRow, workflowStarted: false });
  });
});
