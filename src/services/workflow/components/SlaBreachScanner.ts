import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { escalateTask } from './EscalateTask';

export async function processSlaBreaches(): Promise<void> {
  const now = new Date();

  let breachedTasks: Array<{ witId: string }>;

  try {
    breachedTasks = await prisma.witWorkflowInstanceTask.findMany({
      where: {
        state: 'ACTIVE',
        dueAt: { not: null, lt: now },
        escalatedAt: null,
      },
      select: { witId: true },
    });
  } catch (err: unknown) {
    console.error('SlaBreachScanner: failed to query breached tasks', err);
    return;
  }

  for (const task of breachedTasks) {
    try {
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
      console.error('SlaBreachScanner: failed to escalate task', task.witId, err);
    }
  }
}
