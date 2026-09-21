// src/services/timeoff/split/ValidateSplitLegPair.ts
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';

const SPLIT_STATUS_ID = 6;

export interface SplitLegPairInput {
  parentId: number;
  legAId: number;
  legBId: number;
}

interface ValidatedRecord {
  timeOffId: number;
  timeOffDays: number;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
}

export interface ValidatedSplitLegPair {
  parent: { timeOffId: number; timeOffDays: number };
  legA: ValidatedRecord;
  legB: ValidatedRecord;
}

/**
 * Validates that a candidate 15-day parent and two candidate 7/8-day legs form
 * a valid SV split: all three records belong to the same team member, parent
 * is exactly 15 days and not already linked to another split, each leg is 7
 * or 8 days and not already linked to another split, the two legs total 15
 * days together, and they don't overlap (the earlier leg must end before the
 * later leg starts). Returns the three records sorted so `legA` is always the
 * chronologically earlier one, regardless of input order.
 */
export async function validateSplitLegPair(input: SplitLegPairInput): Promise<ValidatedSplitLegPair> {
  const { parentId, legAId, legBId } = input;

  if (legAId === legBId) {
    throw new AppError('The two legs must be different time-off records.', 400);
  }

  const [parent, rawLegA, rawLegB] = await Promise.all([
    prisma.timeOff.findUnique({ where: { timeOffId: parentId } }),
    prisma.timeOff.findUnique({ where: { timeOffId: legAId } }),
    prisma.timeOff.findUnique({ where: { timeOffId: legBId } }),
  ]);

  if (!parent) throw new AppError(`Parent time-off ${parentId} not found.`, 404);
  if (!rawLegA) throw new AppError(`Leg time-off ${legAId} not found.`, 404);
  if (!rawLegB) throw new AppError(`Leg time-off ${legBId} not found.`, 404);

  if (parent.statusId === SPLIT_STATUS_ID) {
    throw new AppError(`Time-off ${parentId} is already a split parent.`, 400);
  }
  if (parent.timeOffOriginalId !== null) {
    throw new AppError(`Time-off ${parentId} is already a split leg and cannot be used as a parent.`, 400);
  }
  if (Number(parent.timeOffDays) !== 15) {
    throw new AppError(`Parent time-off must be exactly 15 days (found ${Number(parent.timeOffDays)}).`, 400);
  }

  if (rawLegA.teamMemberId !== parent.teamMemberId || rawLegB.teamMemberId !== parent.teamMemberId) {
    throw new AppError(
      'The parent and both legs must all belong to the same team member.',
      400
    );
  }

  const rawLegs: Array<{ label: string; leg: typeof rawLegA }> = [
    { label: 'A', leg: rawLegA },
    { label: 'B', leg: rawLegB },
  ];
  for (const { label, leg } of rawLegs) {
    if (leg.timeOffOriginalId !== null) {
      throw new AppError(`Time-off ${leg.timeOffId} is already linked to another split.`, 400);
    }
    if (leg.statusId === SPLIT_STATUS_ID) {
      throw new AppError(`Time-off ${leg.timeOffId} is itself a split parent and cannot be used as a leg.`, 400);
    }
    const days = Number(leg.timeOffDays);
    if (days !== 7 && days !== 8) {
      throw new AppError(`Leg ${label} (time-off ${leg.timeOffId}) must be 7 or 8 days (found ${days}).`, 400);
    }
  }

  const daysA = Number(rawLegA.timeOffDays);
  const daysB = Number(rawLegB.timeOffDays);
  if (daysA + daysB !== 15) {
    throw new AppError(
      `The two legs must total 15 days together (found ${daysA} + ${daysB} = ${daysA + daysB}).`,
      400
    );
  }

  const [legARaw, legBRaw] =
    rawLegA.timeOffStartDate.getTime() <= rawLegB.timeOffStartDate.getTime()
      ? [rawLegA, rawLegB]
      : [rawLegB, rawLegA];

  if (legARaw.timeOffEndDate.getTime() >= legBRaw.timeOffStartDate.getTime()) {
    throw new AppError(
      'The two legs must not overlap — the earlier leg must end before the later leg starts.',
      400
    );
  }

  return {
    parent: { timeOffId: parent.timeOffId, timeOffDays: Number(parent.timeOffDays) },
    legA: {
      timeOffId: legARaw.timeOffId,
      timeOffDays: Number(legARaw.timeOffDays),
      timeOffStartDate: legARaw.timeOffStartDate,
      timeOffEndDate: legARaw.timeOffEndDate,
    },
    legB: {
      timeOffId: legBRaw.timeOffId,
      timeOffDays: Number(legBRaw.timeOffDays),
      timeOffStartDate: legBRaw.timeOffStartDate,
      timeOffEndDate: legBRaw.timeOffEndDate,
    },
  };
}
