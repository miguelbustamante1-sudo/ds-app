// src/services/timeoff/split/SyncSplitParentStartDate.ts
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

const SPLIT_STATUS_ID = 6;

export interface ValidateSplitLegOrderingInput {
  editedTimeOffId: number;
  newStartDate: Date;
  newEndDate: Date;
}

/**
 * Rejects an edit to a split leg if it would put leg 1 on or after leg 2 (or
 * vice versa). No-ops for a record that isn't a split leg, or one with no
 * sibling on file. Must be called BEFORE the edit is persisted.
 */
export async function validateSplitLegOrdering(input: ValidateSplitLegOrderingInput): Promise<void> {
  const { editedTimeOffId, newStartDate, newEndDate } = input;

  const edited = await prisma.timeOff.findUnique({ where: { timeOffId: editedTimeOffId } });
  if (!edited || edited.timeOffOriginalId === null) return;

  const sibling = await prisma.timeOff.findFirst({
    where: { timeOffOriginalId: edited.timeOffOriginalId, timeOffId: { not: editedTimeOffId } },
  });
  if (!sibling) return;

  const editedIsLegA = newStartDate.getTime() < sibling.timeOffStartDate.getTime();

  if (editedIsLegA) {
    if (newEndDate.getTime() >= sibling.timeOffStartDate.getTime()) {
      throw new AppError(
        `This edit would put leg 1 on or after leg 2 (time-off ${sibling.timeOffId}, starting ${sibling.timeOffStartDate.toISOString().slice(0, 10)}). Leg 1 must end before leg 2 starts.`,
        400
      );
    }
  } else if (newStartDate.getTime() <= sibling.timeOffEndDate.getTime()) {
    throw new AppError(
      `This edit would put leg 2 on or before leg 1 (time-off ${sibling.timeOffId}, ending ${sibling.timeOffEndDate.toISOString().slice(0, 10)}). Leg 2 must start after leg 1 ends.`,
      400
    );
  }
}

export interface SyncSplitParentStartDateInput {
  editedTimeOffId: number;
  newStartDate: Date;
  editedByUserId: number | null;
  editedByEmail: string;
}

/**
 * After a split leg has been successfully edited, syncs the split parent's
 * `timeOffStartDate` to match leg 1's new start date. No-op unless: the
 * edited record is a split leg, it is chronologically leg 1 (starts before
 * its sibling), the parent is still `statusId = Split`, and the start date
 * actually changed. Must be called AFTER the edit is persisted.
 */
export async function syncSplitParentStartDate(input: SyncSplitParentStartDateInput): Promise<void> {
  const { editedTimeOffId, newStartDate, editedByUserId, editedByEmail } = input;

  const edited = await prisma.timeOff.findUnique({ where: { timeOffId: editedTimeOffId } });
  if (!edited || edited.timeOffOriginalId === null) return;

  const parent = await prisma.timeOff.findUnique({ where: { timeOffId: edited.timeOffOriginalId } });
  if (!parent || parent.statusId !== SPLIT_STATUS_ID) return;

  const sibling = await prisma.timeOff.findFirst({
    where: { timeOffOriginalId: edited.timeOffOriginalId, timeOffId: { not: editedTimeOffId } },
  });
  if (!sibling) return;

  const editedIsLegA = newStartDate.getTime() < sibling.timeOffStartDate.getTime();
  if (!editedIsLegA) return;
  if (parent.timeOffStartDate.getTime() === newStartDate.getTime()) return;

  const oldRaw = await fetchRawTimeOffRow(parent.timeOffId);

  await prisma.timeOff.update({
    where: { timeOffId: parent.timeOffId },
    data: {
      timeOffStartDate: newStartDate,
      timeOffLastUpdatedBy: editedByUserId,
      timeOffLastUpdatedDate: new Date(),
    },
  });

  const newRaw = await fetchRawTimeOffRow(parent.timeOffId);
  const comment = `Split parent start date synced to leg 1 (time-off ${editedTimeOffId})`;

  await createTimeOffChangeLog({
    timeOffId: parent.timeOffId,
    comment,
    oldValues: oldRaw,
    newValues: newRaw,
    createdByUserId: editedByUserId,
  });

  await auditOrchestrator.log({
    entityName: 'tbl_tms_time_off',
    entityId: String(parent.timeOffId),
    createdBy: editedByEmail,
    oldValues: oldRaw,
    newValues: newRaw,
    comment,
  });
}
