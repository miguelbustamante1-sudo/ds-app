/**
 * DTOs for the Time-Off External Drift Check endpoint (POST /api/time-offs/external/drift-check).
 * The caller reports a workday id + date it previously saw covered by a time-off in the feed
 * but no longer does; the response explains why via `reason`, with reason-specific fields.
 * When multiple reasons apply to the same underlying changelog entry, `reason` is the first
 * match in this priority order: DATES_CHANGED, STATUS_CHANGED, DELETED.
 */

export interface DriftCheckRequestDTO {
  workdayId: string;
  date: string;
}

export interface UnknownWorkdayIdResult {
  reason: 'UNKNOWN_WORKDAY_ID';
}

export interface EmployeeInactiveResult {
  reason: 'EMPLOYEE_INACTIVE';
  teamMemberEndDate: Date;
}

export interface StillValidResult {
  reason: 'STILL_VALID';
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface DatesChangedResult {
  reason: 'DATES_CHANGED';
  oldStartDate: Date;
  oldEndDate: Date;
  newStartDate: Date;
  newEndDate: Date;
  changedDate: Date;
}

export interface StatusChangedResult {
  reason: 'STATUS_CHANGED';
  oldStatus: number;
  newStatus: number;
  changedDate: Date;
}

export interface DeletedResult {
  reason: 'DELETED';
  changedDate: Date;
}

export interface NoRecordFoundResult {
  reason: 'NO_RECORD_FOUND';
}

export type DriftCheckResponseDTO =
  | UnknownWorkdayIdResult
  | EmployeeInactiveResult
  | StillValidResult
  | DatesChangedResult
  | StatusChangedResult
  | DeletedResult
  | NoRecordFoundResult;

export type DriftCheckReason = DriftCheckResponseDTO['reason'];
