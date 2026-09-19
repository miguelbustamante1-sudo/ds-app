import type { DestroyHandlerContext } from '../../workflow/components/WorkflowDestroyRegistry';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { getStatusByName } from '../../../db/timeOffStatuses';

/**
 * Registered against the workflow engine for businessReferenceType: 'TimeOff'.
 * Called when an admin destroys a workflow instance whose linked business
 * record is a time-off request — without this, a destroyed authorization
 * workflow leaves the request stuck in whatever status it was in (e.g.
 * InAuth), with no record that the workflow backing it was torn down.
 *
 * The status write happens inside ctx.tx, atomic with the instance destruction
 * itself. The returned callback runs after that transaction commits, to record
 * the changelog/audit entries via the global Prisma client.
 */
export async function handleTimeOffWorkflowDestroyed(
  ctx: DestroyHandlerContext,
): Promise<(() => Promise<void>) | undefined> {
  const timeOffId = Number(ctx.businessReferenceId);
  if (!Number.isFinite(timeOffId)) {
    console.error(
      'HandleTimeOffWorkflowDestroyed: non-numeric businessReferenceId',
      ctx.businessReferenceId,
    );
    return undefined;
  }

  const cancelledStatus = await getStatusByName('cancelled');
  if (!cancelledStatus) {
    console.error('HandleTimeOffWorkflowDestroyed: Cancelled status not found in system');
    return undefined;
  }

  const oldRaw = await fetchRawTimeOffRow(timeOffId, ctx.tx);
  if (!oldRaw) {
    console.error('HandleTimeOffWorkflowDestroyed: time-off row not found', timeOffId);
    return undefined;
  }

  await ctx.tx.timeOff.update({
    where: { timeOffId },
    data: {
      statusId: cancelledStatus.statusId,
      timeOffActive: 0,
    },
  });

  const comment = `Time-off cancelled: authorization workflow was destroyed (${ctx.reason})`;

  return async () => {
    const newRaw = await fetchRawTimeOffRow(timeOffId);

    await createTimeOffChangeLog({
      timeOffId,
      comment,
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
      comment,
    });
  };
}
