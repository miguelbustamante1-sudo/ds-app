// src/services/timeoff/split/RelateSplitParentChild.ts
import { prisma } from '../../../db/prisma';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { validateSplitLegPair } from './ValidateSplitLegPair';

const SPLIT_STATUS_ID = 6;

export interface RelateSplitParentChildInput {
  parentId: number;
  legAId: number;
  legBId: number;
  relatedByUserId: number | null;
  relatedByEmail: string;
}

export interface RelateSplitParentChildResult {
  parentId: number;
  legAId: number;
  legBId: number;
}

/**
 * Admin action: retroactively relates three existing, previously-unlinked
 * TimeOff records into a split — a 15-day parent and a 7/8-day leg pair.
 * Validates the trio via `validateSplitLegPair`, then in one transaction
 * flips the parent's statusId to Split and sets its startDate to leg A's
 * startDate (parent endDate is left untouched), and sets `timeOffOriginalId`
 * on both legs to point at the parent.
 */
export async function relateSplitParentChild(
  input: RelateSplitParentChildInput
): Promise<RelateSplitParentChildResult> {
  const { parentId, legAId, legBId, relatedByUserId, relatedByEmail } = input;

  const { parent, legA, legB } = await validateSplitLegPair({ parentId, legAId, legBId });

  const [oldParentRaw, oldLegARaw, oldLegBRaw] = await Promise.all([
    fetchRawTimeOffRow(parent.timeOffId),
    fetchRawTimeOffRow(legA.timeOffId),
    fetchRawTimeOffRow(legB.timeOffId),
  ]);

  const now = new Date();

  await prisma.$transaction([
    prisma.timeOff.update({
      where: { timeOffId: parent.timeOffId },
      data: {
        statusId: SPLIT_STATUS_ID,
        timeOffStartDate: legA.timeOffStartDate,
        timeOffLastUpdatedBy: relatedByUserId,
        timeOffLastUpdatedDate: now,
      },
    }),
    prisma.timeOff.update({
      where: { timeOffId: legA.timeOffId },
      data: { timeOffOriginalId: parent.timeOffId, timeOffLastUpdatedBy: relatedByUserId, timeOffLastUpdatedDate: now },
    }),
    prisma.timeOff.update({
      where: { timeOffId: legB.timeOffId },
      data: { timeOffOriginalId: parent.timeOffId, timeOffLastUpdatedBy: relatedByUserId, timeOffLastUpdatedDate: now },
    }),
  ]);

  const [newParentRaw, newLegARaw, newLegBRaw] = await Promise.all([
    fetchRawTimeOffRow(parent.timeOffId),
    fetchRawTimeOffRow(legA.timeOffId),
    fetchRawTimeOffRow(legB.timeOffId),
  ]);

  const entries = [
    {
      id: parent.timeOffId,
      old: oldParentRaw,
      new: newParentRaw,
      comment: `Related to split as parent — legs ${legA.timeOffId} and ${legB.timeOffId}`,
    },
    { id: legA.timeOffId, old: oldLegARaw, new: newLegARaw, comment: `Related to split as leg A — parent ${parent.timeOffId}` },
    { id: legB.timeOffId, old: oldLegBRaw, new: newLegBRaw, comment: `Related to split as leg B — parent ${parent.timeOffId}` },
  ];

  for (const entry of entries) {
    await createTimeOffChangeLog({
      timeOffId: entry.id,
      comment: entry.comment,
      oldValues: entry.old,
      newValues: entry.new,
      createdByUserId: relatedByUserId,
    });
    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(entry.id),
      createdBy: relatedByEmail,
      oldValues: entry.old,
      newValues: entry.new,
      comment: entry.comment,
    });
  }

  return { parentId: parent.timeOffId, legAId: legA.timeOffId, legBId: legB.timeOffId };
}
