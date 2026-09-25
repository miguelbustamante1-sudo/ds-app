import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { closeResolvedFindingTasks, createFindingTasks } from '../repository';

export interface FindingTaskSyncResult {
  tasksCreated: number;
  tasksClosed: number;
  taskSyncError: string | null;
}

/**
 * Findings Review Workflow step run at the end of both "Run Findings" and "Run Rules":
 * starts a review task for every live finding without one, then closes the task of
 * every finding that no longer needs review. Both steps are idempotent — win_id marks
 * a finding that already has a task, and closing skips tasks that are no longer ACTIVE.
 *
 * Never throws: the run's findings are already saved when this runs, so a workflow
 * problem is reported in the response (taskSyncError) instead of failing the click.
 */
export async function syncFindingTasks(triggeredByEmail: string): Promise<FindingTaskSyncResult> {
  try {
    const created = await createFindingTasks();
    const tasksClosed = await closeFindingTasks(triggeredByEmail);

    // The writes happen inside the Postgres functions, so each batch gets one entry.
    if (created.length > 0) {
      await auditOrchestrator.log({
        entityName: 'fnd_findings',
        entityId: 'finding-review-tasks-created',
        createdBy: triggeredByEmail,
        oldValues: null,
        newValues: { tasksCreated: created.length, rows: created },
        comment: `${created.length} finding review tasks created (win_id set)`,
      });
    }

    return { tasksCreated: created.length, tasksClosed, taskSyncError: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[findings] review task sync failed:', err);
    return { tasksCreated: 0, tasksClosed: 0, taskSyncError: message };
  }
}

/**
 * Closes the open review task of every finding that no longer needs review and audits
 * the batch. Also used by the Detection Rules screen right after turning a rule off, so
 * retired findings leave the inbox without waiting for the next run. Throws on failure.
 */
export async function closeFindingTasks(triggeredByEmail: string): Promise<number> {
  const closed = await closeResolvedFindingTasks();

  if (closed.length > 0) {
    await auditOrchestrator.log({
      entityName: 'wit_workflow_instance_tasks',
      entityId: 'finding-review-tasks-closed',
      createdBy: triggeredByEmail,
      oldValues: null,
      newValues: { tasksClosed: closed.length, rows: closed },
      comment: `${closed.length} finding review tasks closed automatically`,
    });
  }

  return closed.length;
}
