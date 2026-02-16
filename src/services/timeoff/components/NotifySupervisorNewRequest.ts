import { prisma } from '../../../db/prisma';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';
import { formatDateDDMMYYYY } from './FormatDateDDMMYYYY';

export async function notifySupervisorNewRequest(params: {
  teamMemberId: number;
  timeOffId: number;
  timeOffStartDate: string;
  timeOffEndDate: string;
  employeeName: string;
  categoryName: string;
}): Promise<void> {
  // Step 1: Find the active supervisor
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

  // Step 2: Resolve the supervisor's userId
  const supervisorUserIds = await getUserIdsByTeamMemberIds([supervisorAssignment.supervisorId]);
  const supervisorUserId = supervisorUserIds[0];
  if (supervisorUserId === undefined) return;

  // Step 3: Create the notification
  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'item-3',
    payload: {
      userName: params.employeeName,
      avatar: '300-1.png',
      badgeColor: 'online',
      description: `requested ${params.categoryName} time-off`,
      link: `/timeoff-detail/${params.timeOffId}`,
      day: 'Today',
      info: `${formatDateDDMMYYYY(params.timeOffStartDate)} to ${formatDateDDMMYYYY(params.timeOffEndDate)}`,
      sourceId: params.timeOffId,
      sourceEntity: 'TimeOff',
    },
    recipients: [{ userId: supervisorUserId, actionType: 'readonly' }],
  });
}
