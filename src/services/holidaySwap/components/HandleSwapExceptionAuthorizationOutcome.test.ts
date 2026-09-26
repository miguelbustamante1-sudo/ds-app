import { describe, it, expect, vi } from 'vitest';
import { handleSwapExceptionAuthorizationOutcome } from './HandleSwapExceptionAuthorizationOutcome';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import * as loadStatusIdsModule from './LoadStatusIds';
import {
  AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED,
  AUTHORIZE_SWAP_EXCEPTION_OUTCOME_REJECTED,
} from './SwapExceptionAuthorizationConstants';
import type { OutcomeHandlerContext } from '../../workflow/components/WorkflowOutcomeRegistry';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: {
    log: vi.fn(),
  },
}));

function makeCtx(outcomeCode: string): OutcomeHandlerContext {
  return {
    tx: {
      holidaySwap: {
        findUnique: vi.fn().mockResolvedValue({ holidaySwapId: 42, statusId: 7, active: false }),
        update: vi.fn().mockResolvedValue({}),
      },
    } as never,
    winId: 'win-1',
    witId: 'wit-1',
    taskCode: 'AUTHORIZE',
    outcomeCode,
    businessReferenceId: '42',
    performedBy: 'supervisor@example.com',
    performedByUserId: '9',
  };
}

describe('handleSwapExceptionAuthorizationOutcome', () => {
  it('returns undefined for a non-numeric businessReferenceId', async () => {
    const ctx = makeCtx(AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED);
    ctx.businessReferenceId = 'not-a-number';

    const callback = await handleSwapExceptionAuthorizationOutcome(ctx);

    expect(callback).toBeUndefined();
  });

  it('on APPROVED, sets statusId to pending and active to true', async () => {
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    const ctx = makeCtx(AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED);

    const callback = await handleSwapExceptionAuthorizationOutcome(ctx);

    expect(ctx.tx.holidaySwap.update).toHaveBeenCalledWith({
      where: { holidaySwapId: 42 },
      data: { statusId: 1, active: true },
    });

    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ holidaySwapId: 42, statusId: 1, active: true });
    await callback?.();
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'hsw_holiday_swap', entityId: '42', comment: 'Holiday swap exception authorized via workflow authorization' }),
    );
  });

  it('on REJECTED, sets statusId to rejected and active to false', async () => {
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    const ctx = makeCtx(AUTHORIZE_SWAP_EXCEPTION_OUTCOME_REJECTED);

    await handleSwapExceptionAuthorizationOutcome(ctx);

    expect(ctx.tx.holidaySwap.update).toHaveBeenCalledWith({
      where: { holidaySwapId: 42 },
      data: { statusId: 5, active: false },
    });
  });

  it('returns undefined for an unrecognized outcome code', async () => {
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    const ctx = makeCtx('SOME_OTHER_CODE');

    const callback = await handleSwapExceptionAuthorizationOutcome(ctx);

    expect(callback).toBeUndefined();
    expect(ctx.tx.holidaySwap.update).not.toHaveBeenCalled();
  });
});
