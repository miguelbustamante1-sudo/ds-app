import { prisma } from '../../../db/prisma';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export async function notifySupervisorNewRequest(params: {
  teamMemberId: number;
  timeOffId: number;
  timeOffStartDate: string;
  timeOffEndDate: string;
  employeeName: string;
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
      description: 'nuevo Time Off solicitado',
      link: '/supervisor-time-off',
      day: 'Today',
      info: `${params.timeOffStartDate} to ${params.timeOffEndDate}`,
      sourceId: params.timeOffId,
      sourceEntity: 'TimeOff',
    },
    recipients: [{ userId: supervisorUserId, actionType: 'readonly' }],
  });
}
