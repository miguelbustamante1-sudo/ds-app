import { prisma } from '../../../db/prisma';
import type { Prisma, StandaloneTask } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { callMondayApi } from '../lib/mondayClient';
import { decryptSecret } from '../lib/secretCipher';
import { resolveAssigneeEmail } from './ResolveMondayAssignee';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { standaloneTaskOrchestrator } from '../../standalone-tasks/StandaloneTaskOrchestrator';
import { MondayConnectionNotFoundError } from '../errors';
import type { MondayFieldMapping, MondaySyncStatus, MondaySyncSummary } from '@shared/dto';

export const MONDAY_TASK_REFERENCE_TYPE = 'MONDAY_ITEM';

interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
}
interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

// Server-side filter via Monday's __last_updated__ pseudo-column with an exact "between" date
// range, rather than a named relative bucket (e.g. THIS_MONTH) whose calendar-vs-rolling
// boundary semantics Monday doesn't document. The caller supplies the exact range (or gets the
// default below), so the boundary is fully known and verifiable. Filtering on UPDATED_AT also
// naturally covers newly created items, since Monday sets updated_at at creation time too — no
// separate creation-date filter exists or is needed.
const ITEMS_QUERY = `
  query ($boardId: ID!, $columnIds: [String!], $sinceDate: String!, $untilDate: String!) {
    boards (ids: [$boardId]) {
      items_page (
        limit: 500
        query_params: {
          rules: [
            { column_id: "__last_updated__", compare_value: [$sinceDate, $untilDate], operator: between, compare_attribute: "UPDATED_AT" }
          ]
        }
      ) {
        items {
          id
          name
          column_values (ids: $columnIds) { id text value }
        }
      }
    }
  }
`;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Inclusive default range in UTC: today - 7 days through today, both as YYYY-MM-DD (Monday's
// "between" operator compares at day granularity, not exact timestamps). Used by the scheduled
// sync (no one is there to pick a range) and as the manual "Sync Now" dialog's starting values.
function getDefaultSyncRange(): { sinceDate: string; untilDate: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  return {
    sinceDate: sevenDaysAgo.toISOString().slice(0, 10),
    untilDate: now.toISOString().slice(0, 10),
  };
}

async function fetchBoardItems(
  apiKey: string,
  boardId: string,
  columnIds: string[],
  sinceDate: string,
  untilDate: string,
): Promise<MondayItem[]> {
  const result = await callMondayApi<{ boards: Array<{ items_page: { items: MondayItem[] } }> }>(
    apiKey,
    ITEMS_QUERY,
    { boardId, columnIds, sinceDate, untilDate },
  );
  return result.boards[0]?.items_page.items ?? [];
}

// Mirrors the service-account pattern in
// src/services/performance-cases/components/ProcessPostClosureCheckins.ts — this job runs from
// an unauthenticated scheduled context (no req.user), so mutations need a real ds.tbl_users.usr_id.
const SYNC_SERVICE_ACCOUNT_EMAIL = 'api-service@internal';
function resolveServiceActingUser(): { actingUserId: number; actingUserEmail: string } {
  const actingUserId = Number(process.env.API_SERVICE_ACCOUNT_DS_USER_ID);
  if (!actingUserId) throw new AppError('API_SERVICE_ACCOUNT_DS_USER_ID is not configured', 500);
  return { actingUserId, actingUserEmail: SYNC_SERVICE_ACCOUNT_EMAIL };
}

// Only touches an existing task while it's still PENDING, and only when the mapped status
// resolves to something other than PENDING/no-op. Deliberately not routed through
// standaloneTaskOrchestrator.resolveTask — that path also drives recurring-task-instance
// generation, meant for a human resolving a real task, not an automated field sync — but it
// still fills in resolvedBy/resolvedDate/resolutionComment directly so the task never ends up
// APPROVED/REJECTED with a null resolver.
async function syncExistingTaskStatus(
  existingTask: StandaloneTask,
  item: MondayItem,
  mapping: MondayFieldMapping,
  actingUserId: number,
): Promise<boolean> {
  if (existingTask.taskStatus !== 'PENDING' || !mapping.statusColumnId || !mapping.statusValueMap) {
    return false;
  }
  const statusColumnValue = item.column_values.find((cv) => cv.id === mapping.statusColumnId);
  const mondayStatusText = statusColumnValue?.text;
  if (!mondayStatusText) return false;

  const mappedStatus = mapping.statusValueMap[mondayStatusText];
  // existingTask.taskStatus is already guaranteed 'PENDING' by the guard above, so a mapped
  // status only ever needs checking against 'PENDING' itself (a no-op), never against the
  // current value directly.
  if (!mappedStatus || mappedStatus === 'PENDING') {
    return false;
  }

  const after = await prisma.standaloneTask.update({
    where: { taskId: existingTask.taskId },
    data: {
      taskStatus: mappedStatus,
      resolvedBy: actingUserId,
      resolvedDate: new Date(),
      resolutionComment: `Synced from Monday status "${mondayStatusText}"`,
    },
  });

  await auditOrchestrator.log({
    entityName: 'ds.tsk_standalone_tasks',
    entityId: String(existingTask.taskId),
    createdBy: SYNC_SERVICE_ACCOUNT_EMAIL,
    oldValues: existingTask as unknown as Record<string, unknown>,
    newValues: after as unknown as Record<string, unknown>,
    comment: `Standalone task status synced from Monday ("${mondayStatusText}")`,
  });

  return true;
}

async function recordSyncResult(
  mcdId: number,
  status: MondaySyncStatus,
  summary: MondaySyncSummary,
): Promise<void> {
  await prisma.mondayConnection.update({
    where: { mcdId },
    data: {
      mcdLastSyncedDate: new Date(),
      mcdLastSyncStatus: status,
      mcdLastSyncSummary: summary as unknown as Prisma.InputJsonValue,
    },
  });
}

export interface SyncDateRange {
  sinceDate: string;
  untilDate: string;
}

export async function syncConnection(mcdId: number, dateRange?: SyncDateRange): Promise<MondaySyncSummary> {
  const { sinceDate, untilDate } = dateRange ?? getDefaultSyncRange();
  if (!DATE_ONLY_PATTERN.test(sinceDate) || !DATE_ONLY_PATTERN.test(untilDate)) {
    throw new AppError('sinceDate and untilDate must be in YYYY-MM-DD format', 400);
  }
  if (sinceDate > untilDate) {
    throw new AppError('sinceDate must be on or before untilDate', 400);
  }

  const connection = await prisma.mondayConnection.findUnique({ where: { mcdId } });
  if (!connection) throw new MondayConnectionNotFoundError();

  const emptySummary: MondaySyncSummary = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    failures: [],
  };

  if (!connection.mcdIsActive) return emptySummary;

  const mapping = connection.mcdFieldMapping as MondayFieldMapping;
  if (!mapping.assigneeColumnId) {
    const summary: MondaySyncSummary = {
      ...emptySummary,
      failedCount: 1,
      failures: [{ mondayItemId: '-', itemName: '-', reason: 'No assignee column mapped' }],
    };
    await recordSyncResult(mcdId, 'FAILED', summary);
    return summary;
  }

  const apiKey = decryptSecret(connection.mcdApiKeyEncrypted);
  const { actingUserId, actingUserEmail } = resolveServiceActingUser();

  const columnIds = [
    mapping.descriptionColumnId,
    mapping.priorityColumnId,
    mapping.dueDateColumnId,
    mapping.assigneeColumnId,
    mapping.statusColumnId,
  ].filter((id): id is string => Boolean(id));

  let items: MondayItem[];
  try {
    items = await fetchBoardItems(apiKey, connection.mcdBoardId, columnIds, sinceDate, untilDate);
  } catch (err: unknown) {
    const summary: MondaySyncSummary = {
      ...emptySummary,
      failedCount: 1,
      failures: [{
        mondayItemId: '-',
        itemName: '-',
        reason: err instanceof Error ? err.message : 'Monday API call failed',
      }],
    };
    await recordSyncResult(mcdId, 'FAILED', summary);
    return summary;
  }

  const summary: MondaySyncSummary = { ...emptySummary, failures: [] };

  for (const item of items) {
    try {
      const existingTask = await prisma.standaloneTask.findFirst({
        where: { taskReferenceType: MONDAY_TASK_REFERENCE_TYPE, taskReferenceId: item.id },
      });

      if (existingTask) {
        const updated = await syncExistingTaskStatus(existingTask, item, mapping, actingUserId);
        if (updated) summary.updatedCount++;
        else summary.skippedCount++;
        continue;
      }

      const columnValue = (columnId: string | null | undefined) =>
        item.column_values.find((cv) => cv.id === columnId);

      const assigneeEmail = await resolveAssigneeEmail(apiKey, columnValue(mapping.assigneeColumnId));
      if (!assigneeEmail) {
        summary.failedCount++;
        summary.failures.push({
          mondayItemId: item.id,
          itemName: item.name,
          reason: 'Assignee column has no person/email value',
        });
        continue;
      }

      const user = await prisma.user.findUnique({ where: { userEmail: assigneeEmail } });
      if (!user?.teamMemberId) {
        summary.failedCount++;
        summary.failures.push({
          mondayItemId: item.id,
          itemName: item.name,
          reason: `No team member match for ${assigneeEmail}`,
        });
        continue;
      }

      const priorityText = columnValue(mapping.priorityColumnId)?.text ?? undefined;
      const priority = (priorityText && mapping.priorityValueMap?.[priorityText]) || 'MEDIUM';
      const dueDateText = columnValue(mapping.dueDateColumnId)?.text || null;
      const descriptionText = columnValue(mapping.descriptionColumnId)?.text || null;
      const statusText = columnValue(mapping.statusColumnId)?.text ?? undefined;
      const resolvedStatus = (statusText && mapping.statusValueMap?.[statusText]) || 'PENDING';

      await standaloneTaskOrchestrator.createTask(
        {
          taskTitle: item.name,
          taskDescription: descriptionText,
          taskPriority: priority,
          taskDueDate: dueDateText,
          teamMemberId: user.teamMemberId,
          taskReferenceType: MONDAY_TASK_REFERENCE_TYPE,
          taskReferenceId: item.id,
          taskStatus: resolvedStatus,
          ...(resolvedStatus !== 'PENDING' && statusText
            ? { resolutionComment: `Synced from Monday status "${statusText}"` }
            : {}),
        },
        actingUserId,
        actingUserEmail,
        { taskSource: 'API' },
      );
      summary.createdCount++;
    } catch (err: unknown) {
      summary.failedCount++;
      summary.failures.push({
        mondayItemId: item.id,
        itemName: item.name,
        reason: err instanceof Error ? err.message : 'Unknown error processing item',
      });
    }
  }

  const status: MondaySyncStatus =
    summary.failedCount === 0 ? 'SUCCESS' : summary.createdCount + summary.updatedCount > 0 ? 'PARTIAL' : 'FAILED';
  await recordSyncResult(mcdId, status, summary);
  return summary;
}
