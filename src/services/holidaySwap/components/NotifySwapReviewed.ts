import { prisma } from '../../../db/prisma';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export async function notifySwapReviewed(params: {
  teamMemberId: number;
  swapId: number;
  holidayName: string;
  originalDate: string;
  replacementDate: string;
  approved: boolean;
}): Promise<void> {
  const userIds = await getUserIdsByTeamMemberIds([params.teamMemberId]);
  const userId = userIds[0];
  if (userId === undefined) return;

  const description = params.approved
    ? `Your Holiday Swap for [${params.holidayName}] on ${params.originalDate} has been approved. Your replacement day is ${params.replacementDate}.`
    : `Your Holiday Swap for [${params.holidayName}] on ${params.originalDate} has been rejected.`;

  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'holiday-swap',
    payload: {
      userName: 'HR System',
      avatar: '300-1.png',
      badgeColor: 'online',
      description,
      link: `/my-time-off`,
      day: 'Today',
      info: `${params.originalDate} → ${params.replacementDate}`,
      sourceId: params.swapId,
      sourceEntity: 'HolidaySwap',
    },
    recipients: [{ userId, actionType: 'readonly' }],
  });
}
