import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { escalateTask } from './EscalateTask';
import { processMissedTask } from '../MissedTaskOrchestrator';

export async function processSlaBreaches(): Promise<void> {
  const now = new Date();

  let breachedTasks: Array<{ witId: string; deadlineAction: string }>;

  try {
    const rows = await prisma.witWorkflowInstanceTask.findMany({
      where: {
        state: 'ACTIVE',
        dueAt: { not: null, lt: now },
        escalatedAt: null,
      },
      select: {
        witId: true,
        templateTask: { select: { deadlineAction: true } },
      },
    });
    breachedTasks = rows.map((row) => ({
      witId: row.witId,
      deadlineAction: row.templateTask?.deadlineAction ?? 'ESCALATE',
    }));
  } catch (err: unknown) {
    console.error('SlaBreachScanner: failed to query breached tasks', err);
    return;
  }

  for (const task of breachedTasks) {
    try {
      if (task.deadlineAction === 'MISSED_AND_RECREATE') {
        await processMissedTask(task.witId);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await escalateTask(tx, task.witId);
      });
      await auditOrchestrator.log({
        entityName: 'wit_workflow_instance_tasks',
        entityId: task.witId,
        createdBy: 'system',
        oldValues: null,
        newValues: { escalatedAt: new Date().toISOString() },
        comment: 'Task escalated by SLA breach scanner',
      });
    } catch (err: unknown) {
      console.error('SlaBreachScanner: failed to process breached task', task.witId, err);
    }
  }
}
