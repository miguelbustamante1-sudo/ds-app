import type { OutcomeHandlerContext } from '../../workflow/components/WorkflowOutcomeRegistry';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import {
  AUTHORIZE_EXCEPTION_OUTCOME_APPROVED,
  AUTHORIZE_EXCEPTION_OUTCOME_REJECTED,
  TIMEOFF_STATUS_TENTATIVE,
  TIMEOFF_STATUS_REJECTED,
} from './ExceptionAuthorizationConstants';

/**
 * Registered against the workflow engine for businessReferenceType: 'TimeOff'.
 * The orchestrator only calls this handler when the completed task's chosen
 * outcome has wto_triggers_outcome_action = true — set per outcome by the
 * template admin in the workflow builder's Outcome Details panel. This
 * handler no longer checks which task it ran on; the trigger decision
 * already happened before it was called.
 *
 * Flips the request's status based on the authorization outcome:
 *   APPROVED -> Tentative (the normal starting status any request gets)
 *   REJECTED -> Rejected
 *
 * The status write happens inside ctx.tx, atomic with the task completion itself —
 * if it fails, the task completion rolls back rather than leaving the task marked
 * done while the time-off record stays stuck in InAuth. The returned callback runs
 * after that transaction commits, to record the changelog/audit entries via the
 * global Prisma client.
 */
export async function handleExceptionAuthorizationOutcome(
  ctx: OutcomeHandlerContext,
): Promise<(() => Promise<void>) | undefined> {
  const timeOffId = Number(ctx.businessReferenceId);
  if (!Number.isFinite(timeOffId)) {
    console.error(
      'HandleExceptionAuthorizationOutcome: non-numeric businessReferenceId',
      ctx.businessReferenceId,
    );
    return undefined;
  }

  let newStatusId: number;
  let outcomeLabel: string;
  if (ctx.outcomeCode === AUTHORIZE_EXCEPTION_OUTCOME_APPROVED) {
    newStatusId = TIMEOFF_STATUS_TENTATIVE;
    outcomeLabel = 'authorized';
  } else if (ctx.outcomeCode === AUTHORIZE_EXCEPTION_OUTCOME_REJECTED) {
    newStatusId = TIMEOFF_STATUS_REJECTED;
    outcomeLabel = 'rejected';
  } else {
    // Unrecognized outcome code for this task — nothing to do.
    return;
  }

  const oldRaw = await fetchRawTimeOffRow(timeOffId, ctx.tx);

  await ctx.tx.timeOff.update({
    where: { timeOffId },
    data: { statusId: newStatusId },
  });

  return async () => {
    const newRaw = await fetchRawTimeOffRow(timeOffId);

    await createTimeOffChangeLog({
      timeOffId,
      comment: `Time-off exception ${outcomeLabel} via workflow authorization`,
      oldValues: oldRaw,
      newValues: newRaw,
      createdByUserId: Number(ctx.performedByUserId) || null,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: ctx.performedBy,
      oldValues: oldRaw,
      newValues: newRaw,
      comment: `Time-off exception ${outcomeLabel} via workflow authorization`,
    });
  };
}
