import { prisma } from '../../../db/prisma';

interface NotifyInput {
  witId: string;
  eventType: string; // e.g. 'ON_ASSIGNMENT', 'ON_ESCALATION', 'ON_REASSIGNMENT'
  recipientUserIds: string[];
}

export async function notifyWorkflowEvent(input: NotifyInput): Promise<void> {
  let records: Array<{ wntId: string; messageTemplate: string; lastTriggeredAt: Date | null }>;

  try {
    records = await prisma.wntWorkflowInstanceNotification.findMany({
      where: { witId: input.witId, eventType: input.eventType },
      select: { wntId: true, messageTemplate: true, lastTriggeredAt: true },
    });
  } catch (err: unknown) {
    console.error('NotificationDispatcher: failed to load notification records', err);
    return;
  }

  if (records.length === 0) {
    return;
  }

  const now = new Date();

  for (const record of records) {
    try {
      // TODO: This dispatcher currently only logs a warning because there is no outbound
      // email/push mechanism available at this layer. When an outbound notification service
      // is introduced, replace this with a proper dispatch call.
      console.warn(
        'NotificationDispatcher: no outbound mechanism available, eventType:',
        input.eventType,
        'messageTemplate:',
        record.messageTemplate,
        'recipientUserIds:',
        input.recipientUserIds,
      );

      await prisma.wntWorkflowInstanceNotification.update({
        where: { wntId: record.wntId },
        data: { lastTriggeredAt: now },
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
