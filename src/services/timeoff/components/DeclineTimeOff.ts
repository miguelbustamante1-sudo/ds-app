import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export async function declineTimeOff(
  timeOffId: number,
  recipientId: number,
  userId: number
): Promise<void> {
  // Load time-off with team member info for the supervisor notification
  const timeOff = await prisma.timeOff.findUniqueOrThrow({
    where: { timeOffId },
    include: {
      teamMember: {
        select: {
          teamMemberId: true,
          teamMemberNames: true,
          teamMemberSurnames: true,
          teamMemberKnownAs: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    // Step 1: Mark notification recipient as read
    await tx.recipient.updateMany({
      where: { id: recipientId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    // Step 2: Update time-off status to Rejected (sta_id = 5)
    await tx.timeOff.update({
      where: { timeOffId },
      data: { statusId: 5 },
    });

    // Step 3: Create changelog entry
    await tx.timeOffChangeLog.create({
      data: {
        timeOffId,
        changeLogComment: 'Time-off declined by employee',
        changeLogOldValues: { statusId: 1 } as unknown as Prisma.InputJsonValue,
        changeLogNewValues: { statusId: 5 } as unknown as Prisma.InputJsonValue,
        changeLogCreatedBy: userId,
        changeLogCreatedDate: new Date(),
      },
    });
  });

  // Step 4: Send notification to supervisor (outside transaction — best effort)
  try {
    if (!timeOff.teamMemberId) return;

    // Find the supervisor for this team member
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

    if (!supervisorAssignment?.supervisorId) return;

    // Resolve supervisor's userId
    const supervisorUserIds = await getUserIdsByTeamMemberIds([supervisorAssignment.supervisorId]);
    const supervisorUserId = supervisorUserIds[0];
    if (supervisorUserId === undefined) return;

    const employeeName = timeOff.teamMember?.teamMemberKnownAs
      || `${timeOff.teamMember?.teamMemberNames ?? ''} ${timeOff.teamMember?.teamMemberSurnames ?? ''}`.trim()
      || 'An employee';

    const startDate = timeOff.timeOffStartDate.toISOString().split('T')[0];
    const endDate = timeOff.timeOffEndDate.toISOString().split('T')[0];

    await notificationOrchestrator.create({
      categoryName: 'Inbox',
      itemType: 'item-3',
      payload: {
        userName: employeeName,
        avatar: '300-1.png',
        badgeColor: 'busy',
        description: 'declined the time-off you created',
        link: '/supervisor-time-off',
        day: 'Today',
        info: `${startDate} to ${endDate}`,
        sourceId: timeOffId,
        sourceEntity: 'TimeOff',
      },
      recipients: [{ userId: supervisorUserId, actionType: 'readonly' }],
    });
  } catch (notifErr) {
    console.error('[TimeOff] Failed to send decline notification to supervisor:', notifErr);
  }
}
