import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { notificationOrchestrator } from '../../notifications/NotificationOrchestrator';
import { getUserEmailById } from '../../notifications/repository';
import { emailOrchestrator } from '../../email';
import { slackOrchestrator } from '../../slack';

interface NotifyInput {
  witId: string;
  eventType: string; // e.g. 'ON_ASSIGNMENT', 'ON_ESCALATION', 'ON_REASSIGNMENT'
  recipientUserIds: string[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  ON_ASSIGNMENT: 'Assigned',
  ON_REASSIGNMENT: 'Reassigned',
  ON_REMINDER: 'Reminder',
  ON_ESCALATION: 'Escalated',
};

/**
 * Delivers one notification rule to one resolved user across every channel
 * configured on the rule: always in-app, plus email if emailTemplate is set,
 * plus Slack if slackTemplate is set. Each channel is independent — one
 * failing must never block the others.
 */
async function dispatchToRecipient(
  recipientUserId: number,
  taskName: string,
  eventType: string,
  record: { messageTemplate: string; emailTemplate: string | null; slackTemplate: string | null },
): Promise<void> {
  const deliveries: Array<Promise<unknown>> = [
    notificationOrchestrator.create({
      categoryName: 'Inbox',
      itemType: 'item-3',
      payload: {
        userName: 'Workflow',
        avatar: '300-1.png',
        badgeColor: 'online',
        description: record.messageTemplate,
        link: '/my-tasks',
        day: EVENT_TYPE_LABELS[eventType] ?? eventType,
        info: taskName,
      },
      recipients: [{ userId: recipientUserId, actionType: 'readonly' }],
    }),
  ];

  if (record.emailTemplate || record.slackTemplate) {
    const email = await getUserEmailById(recipientUserId);

    if (email) {
      if (record.emailTemplate) {
        deliveries.push(
          emailOrchestrator.send({
            to: email,
            subject: `Workflow task: ${taskName}`,
            body: record.emailTemplate,
            isHtml: false,
          }),
        );
      }
      if (record.slackTemplate) {
        deliveries.push(slackOrchestrator.send({ userEmail: email, message: record.slackTemplate }));
      }
    }
  }

  await Promise.allSettled(deliveries);
}

export async function notifyWorkflowEvent(input: NotifyInput): Promise<void> {
  let records: Array<{
    wntId: string;
    messageTemplate: string;
    emailTemplate: string | null;
    slackTemplate: string | null;
    lastTriggeredAt: Date | null;
  }>;

  try {
    records = await prisma.wntWorkflowInstanceNotification.findMany({
      where: { witId: input.witId, eventType: input.eventType },
      select: { wntId: true, messageTemplate: true, emailTemplate: true, slackTemplate: true, lastTriggeredAt: true },
    });
  } catch (err: unknown) {
    console.error('NotificationDispatcher: failed to load notification records', err);
    return;
  }

  if (records.length === 0) {
    return;
  }

  const task = await prisma.witWorkflowInstanceTask.findUnique({
    where: { witId: input.witId },
    select: { name: true },
  });
  const taskName = task?.name ?? 'Workflow task';

  // recipientUserIds are expected to be resolved ds-app user IDs (numeric strings).
  // A caller may occasionally pass through a role ID instead (e.g. escalation
  // configured with a role rather than a user) — skip those defensively rather
  // than crash the whole dispatch, since resolving a role to its members is a
  // separate concern from delivering a single already-resolved notification.
  const recipientUserIds = input.recipientUserIds
    .map((id) => Number(id))
    .filter((id) => {
      if (Number.isNaN(id)) {
        console.warn('NotificationDispatcher: skipping non-numeric recipient id', id);
        return false;
      }
      return true;
    });

  const now = new Date();

  for (const record of records) {
    try {
      await Promise.allSettled(
        recipientUserIds.map((recipientUserId) =>
          dispatchToRecipient(recipientUserId, taskName, input.eventType, record),
        ),
      );

      await prisma.wntWorkflowInstanceNotification.update({
        where: { wntId: record.wntId },
        data: { lastTriggeredAt: now },
      });

      await auditOrchestrator.log({
        entityName: 'wnt_workflow_instance_notifications',
        entityId: record.wntId,
        createdBy: 'system',
        oldValues: { lastTriggeredAt: record.lastTriggeredAt } as unknown as Record<string, unknown>,
        newValues: { lastTriggeredAt: now.toISOString() } as unknown as Record<string, unknown>,
        comment: `Workflow notification dispatched for event ${input.eventType}`,
      });
    } catch (err: unknown) {
      console.error(
        'NotificationDispatcher: error processing notification record',
        record.wntId,
        err,
      );
    }
  }
}
