import { describe, it, expect, vi } from 'vitest';
import { startSwapExceptionAuthorization } from './StartSwapExceptionAuthorization';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import * as loadStatusIdsModule from './LoadStatusIds';
import * as instantiateModule from './InstantiateSwapExceptionAuthorizationWorkflow';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: {
    log: vi.fn(),
  },
}));

describe('startSwapExceptionAuthorization', () => {
  it('creates the swap as InAuth/inactive, audits, and instantiates the workflow', async () => {
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    const createdRow = {
      holidaySwapId: 100,
      teamMemberId: 10,
      holidayId: 3,
      statusId: 7,
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-06-01'),
      active: false,
      createdBy: 'employee@example.com',
      status: { statusName: 'InAuth' },
    };
    (prisma.holidaySwap.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdRow);
    vi.spyOn(instantiateModule, 'instantiateSwapExceptionAuthorizationWorkflow').mockResolvedValue(true);

    const result = await startSwapExceptionAuthorization({
      teamMemberId: 10,
      holidayId: 3,
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-06-01'),
      createdBy: 'employee@example.com',
      requestedByUserId: 55,
      reasonComment: 'the original holiday date has already passed',
    });

    expect(prisma.holidaySwap.create).toHaveBeenCalledWith({
      data: {
        teamMemberId: 10,
        holidayId: 3,
        statusId: 7,
        originalDate: new Date('2026-01-01'),
        replacementDate: new Date('2026-06-01'),
        active: false,
        createdBy: 'employee@example.com',
      },
      include: { status: { select: { statusName: true } } },
    });
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'hsw_holiday_swap',
        entityId: '100',
        oldValues: null,
        comment: 'Holiday swap created pending exception authorization (the original holiday date has already passed)',
      }),
    );
    expect(instantiateModule.instantiateSwapExceptionAuthorizationWorkflow).toHaveBeenCalledWith({
      holidaySwapId: 100,
      requestedByUserId: 55,
      requestedByEmail: 'employee@example.com',
    });
    expect(result).toEqual({ created: createdRow, workflowStarted: true });
  });
});
