import type { TimeOff } from '@prisma/client';
import { createTimeOff } from '../../../db/timeOffs';
import { fetchRawTimeOffRow, createTimeOffChangeLog } from '../changelog';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { instantiateExceptionAuthorizationWorkflow } from './InstantiateExceptionAuthorizationWorkflow';
import { TIMEOFF_STATUS_IN_AUTH } from './ExceptionAuthorizationConstants';

export interface StartExceptionAuthorizationInput {
  teamMemberId: number;
  timeOffStartDate: string;
  timeOffEndDate: string;
  categoryId: number;
  totalDays: number;
  vacationPeriod: string | null;
  /** The requesting employee's own usr_id — becomes both timeOffCreatedBy and the workflow's ownerUserId, so DYNAMIC/FIRST_SUPERVISOR assignment resolves to their supervisor. */
  requestedByUserId: number;
  requestedByEmail: string;
}

export interface StartExceptionAuthorizationResult {
  created: TimeOff;
  /** False if no published TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE template exists yet — the record is still saved as InAuth but nothing will authorize it until the template is published. */
  workflowStarted: boolean;
}

/**
 * Saves a time-off request that failed the days-before notice check as an
 * InAuth exception (instead of blocking it), and starts the exception
 * authorization workflow if a published template is registered for it.
 */
export async function startExceptionAuthorization(
  input: StartExceptionAuthorizationInput,
): Promise<StartExceptionAuthorizationResult> {
  const created = await createTimeOff(
    input.teamMemberId,
    input.timeOffStartDate,
    input.timeOffEndDate,
    input.requestedByUserId,
    new Date().toISOString(),
    input.categoryId,
    TIMEOFF_STATUS_IN_AUTH,
    input.totalDays,
    undefined,
    true, // timeOffIsException
    input.vacationPeriod,
  );

  const newRaw = await fetchRawTimeOffRow(created.timeOffId);

  await createTimeOffChangeLog({
    timeOffId: created.timeOffId,
    comment: 'Time-off request saved pending exception authorization (insufficient notice)',
    oldValues: null,
    newValues: newRaw,
    createdByUserId: input.requestedByUserId,
  });

  await auditOrchestrator.log({
    entityName: 'tbl_tms_time_off',
    entityId: String(created.timeOffId),
    createdBy: input.requestedByEmail,
    oldValues: null,
    newValues: newRaw,
    comment: 'Time-off request created pending exception authorization',
  });

  const workflowStarted = await instantiateExceptionAuthorizationWorkflow({
    timeOffId: created.timeOffId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
  });

  return { created, workflowStarted };
}
