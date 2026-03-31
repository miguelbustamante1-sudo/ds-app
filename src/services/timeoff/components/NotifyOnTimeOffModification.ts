import { prisma } from '../../../db/prisma';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';
import { getProjectManagersForTeamMember } from '../../teamMember';
import { formatDateDDMMYYYY } from './FormatDateDDMMYYYY';

export async function notifyOnTimeOffModification(params: {
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

  // Step 2: Resolve all PM teamMemberIds for this team member
  const pmTeamMemberIds = await getProjectManagersForTeamMember(params.teamMemberId);

  // Step 3: Batch-resolve all teamMemberIds (supervisor + PMs) to userIds in a single call
  const allTeamMemberIds = [
    ...(supervisorAssignment?.supervisorId ? [supervisorAssignment.supervisorId] : []),
    ...pmTeamMemberIds,
  ];

  if (allTeamMemberIds.length === 0) return;

  const resolvedUserIds = await getUserIdsByTeamMemberIds(allTeamMemberIds);

  // Step 4: Deduplicate
  const uniqueUserIds = [...new Set(resolvedUserIds)];
  if (uniqueUserIds.length === 0) return;

  // Step 5: Create a single notification for all recipients
  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'item-3',
    payload: {
      userName: params.employeeName,
      avatar: '300-1.png',
      badgeColor: 'warning',
      description: 'modified their time-off request',
      link: `/timeoff-detail/${params.timeOffId}`,
      day: 'Today',
      info: `${formatDateDDMMYYYY(params.timeOffStartDate)} to ${formatDateDDMMYYYY(params.timeOffEndDate)}`,
      sourceId: params.timeOffId,
      sourceEntity: 'TimeOff',
    },
    recipients: uniqueUserIds.map((userId) => ({ userId, actionType: 'readonly' })),
  });
}
