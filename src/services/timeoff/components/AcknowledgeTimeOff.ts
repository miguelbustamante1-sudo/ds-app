import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';
import { getProjectManagersForTeamMember } from '../../teamMember';
import { formatDateDDMMYYYY } from './FormatDateDDMMYYYY';

export async function acknowledgeTimeOff(
  timeOffId: number,
  recipientId: number,
  userId: number
): Promise<void> {
  // Load time-off details for the notification
  const timeOff = await prisma.timeOff.findUniqueOrThrow({
    where: { timeOffId },
    include: {
      teamMember: {
        select: {
          teamMemberNames: true,
          teamMemberSurnames: true,
        },
      },
      category: {
        select: { categoryName: true },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    // Step 1: Mark notification recipient as read
    await tx.recipient.updateMany({
      where: { id: recipientId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    // Step 2: Update time-off status to Acknowledge (sta_id = 2)
    await tx.timeOff.update({
      where: { timeOffId },
      data: { statusId: 2 },
    });

    // Step 3: Create changelog entry
    await tx.timeOffChangeLog.create({
      data: {
        timeOffId,
        changeLogComment: 'Time-off acknowledged by employee',
        changeLogOldValues: { statusId: 1 } as unknown as Prisma.InputJsonValue,
        changeLogNewValues: { statusId: 2 } as unknown as Prisma.InputJsonValue,
        changeLogCreatedBy: userId,
        changeLogCreatedDate: new Date(),
      },
    });
  });

  // Step 4: Send notification to supervisor and PMs (outside transaction — best effort)
  try {
    if (!timeOff.teamMemberId) return;

    const today = new Date();
    const supervisorAssignment = await prisma.supervisorAssignment.findFirst({
      where: {
        teamMemberId: timeOff.teamMemberId,
        supervisorAssignmentStartDate: { lte: today },
        OR: [
          { supervisorAssignmentEndDate: null },
          { supervisorAssignmentEndDate: { gte: today } },
        ],
      },
      select: { supervisorId: true },
    });

    const pmTeamMemberIds = await getProjectManagersForTeamMember(timeOff.teamMemberId);

    const allTeamMemberIds = [
      ...(supervisorAssignment?.supervisorId ? [supervisorAssignment.supervisorId] : []),
      ...pmTeamMemberIds,
    ];

    if (allTeamMemberIds.length === 0) return;

    const resolvedUserIds = await getUserIdsByTeamMemberIds(allTeamMemberIds);
    const uniqueUserIds = [...new Set(resolvedUserIds)];
    if (uniqueUserIds.length === 0) return;

    const employeeName =
      `${timeOff.teamMember?.teamMemberNames ?? ''} ${timeOff.teamMember?.teamMemberSurnames ?? ''}`.trim()
      || 'An employee';

    await notificationOrchestrator.create({
      categoryName: 'Inbox',
      itemType: 'item-3',
      payload: {
        userName: employeeName,
        avatar: '300-1.png',
        badgeColor: 'online',
        description: 'acknowledged their time-off request',
        link: `/timeoff-detail/${timeOffId}`,
        day: 'Today',
        info: `${formatDateDDMMYYYY(timeOff.timeOffStartDate.toISOString())} to ${formatDateDDMMYYYY(timeOff.timeOffEndDate.toISOString())}`,
        sourceId: timeOffId,
        sourceEntity: 'TimeOff',
      },
      recipients: uniqueUserIds.map((uid) => ({ userId: uid, actionType: 'readonly' })),
    });
  } catch (notifErr) {
    console.error('[TimeOff] Failed to send acknowledge notification:', notifErr);
  }
}
