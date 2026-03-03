/**
 * Countdown Notification Queries
 *
 * Two focused query functions used exclusively by the countdown job:
 * - findTimeOffsStartingOn: find time offs whose start date matches a target date
 * - wasNotificationSentToday: dedup guard to prevent re-sending on server restarts
 */

import { prisma } from '../../../db/prisma';

export interface CountdownTimeOffDTO {
  timeOffId: number;
  teamMemberId: number;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  categoryName: string;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

const EXCLUDED_STATUS_NAMES = ['rejected', 'cancelled'];

/**
 * Returns all active, non-rejected/cancelled time offs whose start date
 * equals the given target date.
 */
export async function findTimeOffsStartingOn(targetDate: Date): Promise<CountdownTimeOffDTO[]> {
  // Resolve excluded status IDs once per call
  const excludedStatuses = await prisma.timeOffStatus.findMany({
    where: { statusName: { in: EXCLUDED_STATUS_NAMES, mode: 'insensitive' } },
    select: { statusId: true },
  });
  const excludedStatusIds = excludedStatuses.map((s) => s.statusId);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      timeOffStartDate: targetDate,
      timeOffActive: 1,
      ...(excludedStatusIds.length > 0
        ? { NOT: { statusId: { in: excludedStatusIds } } }
        : {}),
    },
    select: {
      timeOffId: true,
      teamMemberId: true,
      timeOffStartDate: true,
      timeOffEndDate: true,
      category: {
        select: { categoryName: true },
      },
      teamMember: {
        select: {
          teamMemberNames: true,
          teamMemberSurnames: true,
        },
      },
    },
  });

  return timeOffs
    .filter((t) => t.teamMemberId !== null && t.teamMember !== null && t.category !== null)
    .map((t) => ({
      timeOffId: t.timeOffId,
      teamMemberId: t.teamMemberId!,
      timeOffStartDate: t.timeOffStartDate,
      timeOffEndDate: t.timeOffEndDate,
      categoryName: t.category!.categoryName,
      teamMemberNames: t.teamMember!.teamMemberNames,
      teamMemberSurnames: t.teamMember!.teamMemberSurnames,
    }));
}

interface RawCount {
  count: bigint;
}

/**
 * Returns true if a countdown notification has already been sent today for
 * the given time off. Used to guard against duplicate sends on server restarts.
 */
export async function wasNotificationSentToday(timeOffId: number): Promise<boolean> {
  const result = await prisma.$queryRaw<RawCount[]>`
    SELECT COUNT(*)::bigint AS count
    FROM com.ntf_notifications
    WHERE ntf_payload->>'sourceEntity' = 'TimeOff'
      AND ntf_payload->>'sourceId' = ${String(timeOffId)}
      AND ntf_created_at::date = CURRENT_DATE
  `;

  return (result[0]?.count ?? BigInt(0)) > BigInt(0);
}
