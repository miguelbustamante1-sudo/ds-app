// src/services/timeoff/split/CancelSplitLeg.ts
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

const TAKEN_STATUS_ID = 3;

export interface CancelSplitLegInput {
  /** The split leg the caller is trying to cancel. */
  timeOffId: number;
  cancelledStatusId: number;
  comment: string;
  cancelledByUserId: number | null;
  cancelledByEmail: string;
}

export interface CancelSplitLegResult {
  cascaded: boolean;
  cancelledIds: number[];
}

/**
 * Cancel guard + cascade for a leg of an SV split (a TimeOff record with
 * `timeOffOriginalId` set). If the sibling leg has already passed (end date
 * in the past, or status Taken), the cancellation is blocked entirely — the
 * only valid move at that point is rescheduling this leg via edit. Otherwise
 * the target leg, its sibling, and the split parent are all cancelled
 * together, since a lone remaining 7-or-8-day leg would not be a valid
 * standalone SV vacation record.
 */
export async function cancelSplitLeg(input: CancelSplitLegInput): Promise<CancelSplitLegResult> {
  const { timeOffId, cancelledStatusId, comment, cancelledByUserId, cancelledByEmail } = input;

  const leg = await prisma.timeOff.findUnique({ where: { timeOffId } });
  if (!leg) throw new AppError(`Time-off ${timeOffId} not found.`, 404);
  if (leg.timeOffOriginalId === null) {
    throw new AppError('cancelSplitLeg called on a record that is not a split leg.', 400);
  }

  const parentId = leg.timeOffOriginalId;

  const [parent, sibling] = await Promise.all([
    prisma.timeOff.findUnique({ where: { timeOffId: parentId } }),
    prisma.timeOff.findFirst({ where: { timeOffOriginalId: parentId, timeOffId: { not: timeOffId } } }),
  ]);

  if (!parent) throw new AppError(`Split parent ${parentId} not found.`, 404);
  if (!sibling) throw new AppError(`Sibling leg for split ${parentId} not found.`, 404);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const siblingPassed =
    sibling.statusId === TAKEN_STATUS_ID || sibling.timeOffEndDate.getTime() < today.getTime();

  if (siblingPassed) {
    throw new AppError(
      'Cannot cancel this leg: the other leg of this split has already passed. Reschedule this leg instead of cancelling it.',
      400
    );
  }

  const targets = [leg, sibling, parent];
  const oldRaws = new Map<number, Record<string, unknown> | null>();
  for (const record of targets) {
    oldRaws.set(record.timeOffId, await fetchRawTimeOffRow(record.timeOffId));
  }

  const now = new Date();
  await prisma.$transaction(
    targets.map((record) =>
      prisma.timeOff.update({
        where: { timeOffId: record.timeOffId },
        data: {
          statusId: cancelledStatusId,
          timeOffLastUpdatedBy: cancelledByUserId,
          timeOffLastUpdatedDate: now,
        },
      })
    )
  );

  for (const record of targets) {
    const isTarget = record.timeOffId === timeOffId;
    const entryComment = isTarget
      ? comment
      : `Cascaded cancellation — split leg ${timeOffId} was cancelled while both legs were still in the future`;
    const newRaw = await fetchRawTimeOffRow(record.timeOffId);

    await createTimeOffChangeLog({
      timeOffId: record.timeOffId,
      comment: entryComment,
      oldValues: oldRaws.get(record.timeOffId) ?? null,
      newValues: newRaw,
      createdByUserId: cancelledByUserId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(record.timeOffId),
      createdBy: cancelledByEmail,
      oldValues: oldRaws.get(record.timeOffId) ?? null,
      newValues: newRaw,
      comment: entryComment,
    });
  }

  return { cascaded: true, cancelledIds: targets.map((r) => r.timeOffId) };
}
