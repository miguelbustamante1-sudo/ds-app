import { prisma } from '../../../db/prisma';
import type { OutcomeHandlerContext } from '../../workflow/components/WorkflowOutcomeRegistry';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { loadStatusIds } from './LoadStatusIds';
import {
  AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED,
  AUTHORIZE_SWAP_EXCEPTION_OUTCOME_REJECTED,
} from './SwapExceptionAuthorizationConstants';

const ENTITY_NAME = 'hsw_holiday_swap';

/**
 * Registered against the workflow engine for businessReferenceType: 'HolidaySwap'.
 * Shared across every holiday-swap exception reason — the orchestrator only
 * calls this handler when the completed task's chosen outcome has
 * wto_triggers_outcome_action = true.
 *
 * Flips the swap's status based on the authorization outcome:
 *   APPROVED -> Pending (Tentative), active -> true (re-enters normal supervisor review)
 *   REJECTED -> Rejected, active -> false
 *
 * The status write happens inside ctx.tx, atomic with the task completion itself.
 * The returned callback runs after that transaction commits, to record the
 * audit entry via the global Prisma client.
 */
export async function handleSwapExceptionAuthorizationOutcome(
  ctx: OutcomeHandlerContext,
): Promise<(() => Promise<void>) | undefined> {
  const holidaySwapId = Number(ctx.businessReferenceId);
  if (!Number.isFinite(holidaySwapId)) {
    console.error(
      'HandleSwapExceptionAuthorizationOutcome: non-numeric businessReferenceId',
      ctx.businessReferenceId,
    );
    return undefined;
  }

  const statusIds = await loadStatusIds();

  let newStatusId: number;
  let newActive: boolean;
  let outcomeLabel: string;
  if (ctx.outcomeCode === AUTHORIZE_SWAP_EXCEPTION_OUTCOME_APPROVED) {
    newStatusId = statusIds.pending;
    newActive = true;
    outcomeLabel = 'authorized';
  } else if (ctx.outcomeCode === AUTHORIZE_SWAP_EXCEPTION_OUTCOME_REJECTED) {
    newStatusId = statusIds.rejected;
    newActive = false;
    outcomeLabel = 'rejected';
  } else {
    // Unrecognized outcome code for this task — nothing to do.
    return undefined;
  }

  const before = await ctx.tx.holidaySwap.findUnique({ where: { holidaySwapId } });

  await ctx.tx.holidaySwap.update({
    where: { holidaySwapId },
    data: { statusId: newStatusId, active: newActive },
  });

  return async () => {
    const after = await prisma.holidaySwap.findUnique({ where: { holidaySwapId } });

    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(holidaySwapId),
      createdBy: ctx.performedBy,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Holiday swap exception ${outcomeLabel} via workflow authorization`,
    });
  };
}
