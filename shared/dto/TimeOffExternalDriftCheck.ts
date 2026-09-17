/**
 * DTOs for the Time-Off External Drift Check endpoint (POST /api/time-offs/external/drift-check).
 * The caller reports a workday id + date it previously saw covered by a time-off in the feed
 * but no longer does; the response explains why via `reason`, with reason-specific fields.
 * When multiple reasons apply to the same underlying changelog entry, `reason` is the first
 * match in this priority order: DATES_CHANGED, STATUS_CHANGED, DELETED.
 */

export type DriftCheckReason =
  | 'UNKNOWN_WORKDAY_ID'
  | 'EMPLOYEE_INACTIVE'
  | 'STILL_VALID'
  | 'DATES_CHANGED'
  | 'STATUS_CHANGED'
  | 'DELETED'
  | 'NO_RECORD_FOUND';

export interface DriftCheckRequestDTO {
  workdayId: string;
  date: string;
}

export interface DriftCheckResponseDTO {
  reason: DriftCheckReason;
  teamMemberEndDate?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  oldStartDate?: Date;
  oldEndDate?: Date;
  newStartDate?: Date;
  newEndDate?: Date;
  oldStatus?: number;
  newStatus?: number;
  changedDate?: Date;
}
