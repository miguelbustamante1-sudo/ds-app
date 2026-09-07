import { prisma } from '../../../db/prisma';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../../timeoff/changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import type { TimeOffToCancel } from './LoadTimeOffsToCancel';
import { warn } from '../../../logger';

export interface CancelResult {
  cancelledCount: number;
}

async function cancelBatch(
  records: TimeOffToCancel[],
  cancelledStatusId: number,
  comment: string,
): Promise<number> {
  if (records.length === 0) return 0;

  // 1. Snapshot old values before the write (Rule 3.12) — zipped with IDs to avoid index access
  const withOldSnapshots = await Promise.all(
    records.map(async ({ timeOffId }) => ({
      timeOffId,
      oldSnapshot: await fetchRawTimeOffRow(timeOffId),
    }))
  );

  // 2. Cancel all in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const { timeOffId } of records) {
      await tx.timeOff.update({
        where: { timeOffId },
        data: {
          timeOffActive: 0,
          statusId: cancelledStatusId,
        },
      });
    }
  });

  // 3. Snapshot new values after the write (Rule 3.12)
  const withBothSnapshots = await Promise.all(
    withOldSnapshots.map(async ({ timeOffId, oldSnapshot }) => ({
      timeOffId,
      oldSnapshot,
      newSnapshot: await fetchRawTimeOffRow(timeOffId),
    }))
  );

  // 4. Write changelog entry + audit log entry per cancelled record (Rule 3.12 + Rule 3.4)
  for (const { timeOffId, oldSnapshot, newSnapshot } of withBothSnapshots) {
    await createTimeOffChangeLog({
      timeOffId,
      comment,
      oldValues:       oldSnapshot,
      newValues:       newSnapshot,
      createdByUserId: null,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId:   String(timeOffId),
      createdBy:  'attrition-job',
      oldValues:  oldSnapshot ?? null,
      newValues:  newSnapshot ?? null,
      comment,
    });
  }

  return records.length;
}

export async function cancelTimeOffs(
  future: TimeOffToCancel[],
  overlapping: TimeOffToCancel[],
  cancelledStatusId: number,
  endDateStr: string,
): Promise<CancelResult> {
  const futureComment      = `Automatically cancelled: team member end date (${endDateStr}) has been reached.`;
  const overlappingComment = `Automatically cancelled: time-off extends past team member end date (${endDateStr}) and was in Tentative status.`;

  const [cancelledFuture, cancelledOverlapping] = await Promise.all([
    cancelBatch(future,      cancelledStatusId, futureComment),
    cancelBatch(overlapping, cancelledStatusId, overlappingComment),
  ]);

  if (cancelledFuture > 0) {
    warn(`[Attrition] Cancelled ${cancelledFuture} future time-off(s) (end date: ${endDateStr})`);
  }
  if (cancelledOverlapping > 0) {
    warn(`[Attrition] Cancelled ${cancelledOverlapping} overlapping Tentative time-off(s) (end date: ${endDateStr})`);
  }

  return { cancelledCount: cancelledFuture + cancelledOverlapping };
}
