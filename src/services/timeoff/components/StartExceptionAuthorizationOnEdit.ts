import type { TimeOff } from '@prisma/client';
import { updateTimeOff } from '../../../db/timeOffs';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { instantiateExceptionAuthorizationWorkflow } from './InstantiateExceptionAuthorizationWorkflow';
import { TIMEOFF_STATUS_IN_AUTH } from './ExceptionAuthorizationConstants';

export interface StartExceptionAuthorizationOnEditInput {
  timeOffId: number;
  teamMemberId: number;
  timeOffStartDate: string;
  timeOffEndDate: string;
  categoryId: number;
  totalDays: number;
  /** The acting user's own usr_id — becomes both timeOffLastUpdatedBy and the workflow's ownerUserId, so DYNAMIC/FIRST_SUPERVISOR assignment resolves to the acting user's own supervisor (the employee's for self-edit, the supervisor's supervisor for a supervisor edit). */
  requestedByUserId: number;
  requestedByEmail: string;
  /** Optional workflow-instance context entries (e.g. days-before violation detail) forwarded as-is to the workflow instantiation — see InstantiateExceptionAuthorizationWorkflowInput.contextJson. */
  contextJson?: Array<{ key: string; value: string | number | boolean }>;
}

export interface StartExceptionAuthorizationOnEditResult {
  updated: TimeOff | null;
  workflowStarted: boolean;
}

/**
 * Applies an edit that failed only the days-before notice check by saving the
 * existing time-off as an InAuth exception (instead of blocking it), and
 * starts the exception authorization workflow if a published template is
 * registered for it. Mirrors StartExceptionAuthorization but updates the
 * existing record rather than creating a new one.
 */
export async function startExceptionAuthorizationOnEdit(
  input: StartExceptionAuthorizationOnEditInput,
): Promise<StartExceptionAuthorizationOnEditResult> {
  const oldRaw = await fetchRawTimeOffRow(input.timeOffId);

  const updated = await updateTimeOff(
    input.timeOffId,
    input.teamMemberId,
    input.timeOffStartDate,
    input.timeOffEndDate,
    input.requestedByUserId,
    new Date().toISOString(),
    input.categoryId,
    TIMEOFF_STATUS_IN_AUTH,
    input.totalDays,
    true, // timeOffIsException
  );

  const newRaw = await fetchRawTimeOffRow(input.timeOffId);

  await createTimeOffChangeLog({
    timeOffId: input.timeOffId,
    comment: 'Time-off request edited and saved pending exception authorization (insufficient notice)',
    oldValues: oldRaw,
    newValues: newRaw,
    createdByUserId: input.requestedByUserId,
  });

  await auditOrchestrator.log({
    entityName: 'tbl_tms_time_off',
    entityId: String(input.timeOffId),
    createdBy: input.requestedByEmail,
    oldValues: oldRaw,
    newValues: newRaw,
    comment: 'Time-off request edited pending exception authorization',
  });

  const workflowStarted = await instantiateExceptionAuthorizationWorkflow({
    timeOffId: input.timeOffId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
    ...(input.contextJson ? { contextJson: input.contextJson } : {}),
  });

  return { updated, workflowStarted };
}
