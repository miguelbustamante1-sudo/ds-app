import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';
import { emailOrchestrator } from '../../email';
import type { CaseStakeholders } from './ResolveCaseStakeholders';

export interface CaseNotificationInput {
  caseId: number;
  caseCode: string;
  title: string;
  message: string;
  recipientTeamMemberIds: number[];
  notifyManager?: boolean;
  stakeholders: CaseStakeholders;
}

/**
 * Sends an in-app notification (via NotificationOrchestrator, itemType 'item-3' — the
 * same payload shape already wired to a readonly "view details" card in the frontend
 * notification feed) to the resolved team-member recipients, plus an optional direct
 * email to the case's client-side manager (who has no dsUserId/notification recipient row).
 */
export async function sendCaseNotification(input: CaseNotificationInput): Promise<void> {
  const teamMemberIds = input.recipientTeamMemberIds.filter(
    (id, index, all) => id != null && all.indexOf(id) === index,
  );

  if (teamMemberIds.length > 0) {
    const userIds = await getUserIdsByTeamMemberIds(teamMemberIds);
    if (userIds.length > 0) {
      await notificationOrchestrator.create({
        categoryName: 'PerformanceManagement',
        itemType: 'item-3',
        payload: {
          userName: 'Performance Management',
          avatar: '',
          badgeColor: 'busy',
          description: `${input.title}: ${input.message}`,
          link: `/performance-cases/${input.caseId}`,
          day: '',
          info: `Case ${input.caseCode}`,
          sourceId: input.caseId,
          sourceEntity: 'PerformanceCase',
        },
        recipients: userIds.map((userId) => ({ userId, actionType: 'readonly' })),
      });
    }
  }

  if (input.notifyManager && input.stakeholders.managerEmail) {
    await emailOrchestrator.send({
      to: input.stakeholders.managerEmail,
      subject: input.title,
      body: `${input.message} (Case ${input.caseCode})`,
    });
  }
}
