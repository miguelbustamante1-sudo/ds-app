import { prisma } from '../../../db/prisma';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export async function notifySwapSubmitted(params: {
  teamMemberId: number;
  swapId: number;
  employeeName: string;
  holidayName: string;
  originalDate: string;
  replacementDate: string;
}): Promise<void> {
  const today = new Date();

  const supervisorAssignment = await prisma.supervisorAssignment.findFirst({
    where: {
      teamMemberId: params.teamMemberId,
      supervisorAssignmentStartDate: { lte: today },
      OR: [
        { supervisorAssignmentEndDate: null },
        { supervisorAssignmentEndDate: { gte: today } },
      ],
    },
    select: { supervisorId: true },
  });

  if (!supervisorAssignment?.supervisorId) return;

  const supervisorUserIds = await getUserIdsByTeamMemberIds([supervisorAssignment.supervisorId]);
  const supervisorUserId = supervisorUserIds[0];
  if (supervisorUserId === undefined) return;

  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'holiday-swap',
    payload: {
      userName: params.employeeName,
      avatar: '300-1.png',
      badgeColor: 'online',
      description: `has requested a Holiday Swap: working [${params.holidayName}] on ${params.originalDate} in exchange for ${params.replacementDate}.`,
      link: `/my-team`,
      day: 'Today',
      info: `${params.originalDate} → ${params.replacementDate}`,
      sourceId: params.swapId,
      sourceEntity: 'HolidaySwap',
    },
    recipients: [{ userId: supervisorUserId, actionType: 'readonly' }],
  });
}
