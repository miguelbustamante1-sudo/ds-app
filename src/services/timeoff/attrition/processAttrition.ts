/**
 * Attrition Job: Automatic Time-Off Cancellation
 *
 * Finds team members whose end date has been reached and cancels all their
 * future active time-off requests. Writes a change log entry per cancelled record.
 *
 * Designed to be called once on startup and then every 24 hours.
 */

import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { warn, error } from '../../../logger';

const CANCELLED_STATUS_NAME = 'cancelled';

export async function processAttritionTimeOffs(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 1. Resolve the "Cancelled" status ID
    const cancelledStatus = await prisma.timeOffStatus.findFirst({
      where: { statusName: { equals: CANCELLED_STATUS_NAME, mode: 'insensitive' } },
      select: { statusId: true },
    });

    if (!cancelledStatus) {
      error('[Attrition] "Cancelled" status not found in tbl_to_statuses — skipping job');
      return;
    }

    const cancelledStatusId = cancelledStatus.statusId;

    // 2. Find team members whose departure date has been reached (today or earlier)
    const departedMembers = await prisma.teamMember.findMany({
      where: {
        teamMemberEndDate: { lte: today },
      },
      select: {
        teamMemberId: true,
        teamMemberEndDate: true,
      },
    });

    if (departedMembers.length === 0) {
      return;
    }

    warn(`[Attrition] Processing ${departedMembers.length} departed team member(s)`);

    let totalCancelled = 0;

    for (const member of departedMembers) {
      // 3. Find future active time-offs that are not already cancelled
      const futureTimeOffs = await prisma.timeOff.findMany({
        where: {
          teamMemberId: member.teamMemberId,
          timeOffActive: 1,
          timeOffStartDate: { gt: today },
          NOT: { statusId: cancelledStatusId },
        },
        select: {
          timeOffId: true,
          statusId: true,
          timeOffDays: true,
          categoryId: true,
        },
      });

      if (futureTimeOffs.length === 0) continue;

      const endDateStr = member.teamMemberEndDate
        ? member.teamMemberEndDate.toISOString().split('T')[0]
        : 'unknown';

      // 4. Cancel each in a single transaction, writing one changelog entry per record
      await prisma.$transaction(async (tx) => {
        for (const timeOff of futureTimeOffs) {
          await tx.timeOff.update({
            where: { timeOffId: timeOff.timeOffId },
            data: {
              timeOffActive: 0,
              statusId: cancelledStatusId,
            },
          });

          await tx.timeOffChangeLog.create({
            data: {
              timeOffId: timeOff.timeOffId,
              changeLogComment: `Automatically cancelled: team member end date (${endDateStr}) has been reached.`,
              changeLogOldValues: {
                statusId: timeOff.statusId,
                active: true,
              } as Prisma.InputJsonValue,
              changeLogNewValues: {
                statusId: cancelledStatusId,
                active: false,
              } as Prisma.InputJsonValue,
              changeLogCreatedBy: null,
              changeLogCreatedDate: new Date(),
            },
          });
        }
      });

      totalCancelled += futureTimeOffs.length;
      warn(`[Attrition] Cancelled ${futureTimeOffs.length} time-off(s) for team member ${member.teamMemberId} (end date: ${endDateStr})`);
    }

    if (totalCancelled > 0) {
      warn(`[Attrition] Job completed — ${totalCancelled} time-off(s) cancelled across ${departedMembers.length} member(s)`);
    }
  } catch (e) {
    error('[Attrition] Job failed:', e instanceof Error ? e.message : String(e));
  }
}
