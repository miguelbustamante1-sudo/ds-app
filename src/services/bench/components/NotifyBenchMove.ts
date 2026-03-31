import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export async function notifyBenchMove(params: {
  benchId: number;
  tmName: string;
  functionalAreaName: string;
  startDate: string;
  newSupervisorId: number;
  createdBy: string;
}): Promise<void> {
  const userIds = await getUserIdsByTeamMemberIds([params.newSupervisorId]);
  const newSupervisorUserId = userIds[0];
  if (newSupervisorUserId === undefined) return;

  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'bench-move',
    payload: {
      userName: params.createdBy,
      avatar: '',
      badgeColor: 'yellow',
      description: `${params.tmName} has been moved to bench under your supervision`,
      link: `/bench-move/${params.benchId}`,
      day: params.startDate,
      info: params.functionalAreaName,
      sourceId: params.benchId,
      sourceEntity: 'Bench',
    },
    recipients: [{ userId: newSupervisorUserId, actionType: 'readonly' }],
  });
}
