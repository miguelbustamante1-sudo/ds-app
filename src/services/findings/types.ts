/** One active watched entity type's pass within a Run Findings click (one rnl_run_log row). */
export interface EntityFindingsRunDto {
  entityType: string;
  status: 'completed' | 'failed';
  /** Null only when the run log itself could not be started. */
  runLogId: number | null;
  findingsCreated: number;
  findingsUpdated: number;
  findingsResolved: number;
  findingsSuperseded: number;
  entitiesCompared: number;
  fieldsChecked: number;
  observationsRecorded: number;
  error: string | null;
}

export interface RunFindingsResultDto {
  runId: string;
  /** One entry per active entity type, in entity-type order; empty when none are active. */
  entities: EntityFindingsRunDto[];
  /** Review tasks created / closed by the same click (Findings Review Workflow). */
  tasksCreated: number;
  tasksClosed: number;
  /** Set when task sync failed; the run's own findings are already saved. */
  taskSyncError: string | null;
}

export interface FindingDto {
  fndId: number;
  fndFingerprint: string;
  cdeEntityType: string;
  fndEntityId: string;
  cdfFieldPath: string | null;
  changeType: 'added' | 'deleted' | 'modified' | null;
  oldValue: unknown;
  newValue: unknown;
  severity: string;
  status: string;
  assignee: string | null;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  fieldDisplayName?: string | undefined;
  rulId: number | null;
  rulType: string | null;
  rulDefinition: unknown;
}

export interface WatchedField {
  fieldPath: string;
  displayName: string;
}

export interface FindingInsert {
  entityId: string;
  fieldPath: string | null;
  changeType: 'added' | 'deleted' | 'modified';
  oldValue: unknown;
  newValue: unknown;
  fingerprint: string;
}

/** At most one live (open or acknowledged) per (entityId, fieldPath) — enforced by uq_fnd_open_entity_field. */
export interface OpenFindingRef {
  findingId: number;
  entityId: string;
  fieldPath: string | null;
  newValue: unknown;
}

export type ReconcileAction =
  /** Case A — value returned to the approved baseline. */
  | { kind: 'self_resolve'; findingId: number }
  /** Case D — same drift observed again. */
  | { kind: 'recur'; findingId: number }
  /** Case C — drift with no open finding yet. */
  | { kind: 'open'; insert: FindingInsert }
  /** Case E — drifted to a different value before the first drift was resolved. */
  | { kind: 'supersede'; findingId: number; insert: FindingInsert };

export interface ObservationRow {
  entityId: string;
  payload: Record<string, unknown>;
  rowHash: string;
}

export interface ApplyPlanResult {
  opened: number;
  recurred: number;
  resolved: number;
  superseded: number;
}

export interface FindingStatusCountDto {
  entityType: string;
  status: string;
  count: number;
}

/** finding_action values emitted by ds.fn_run_state_rules(). */
export const STATE_RULE_ACTION_RESOLVED = 'finding self-resolved';
export const STATE_RULE_ACTION_RESOLVED_CONFIRMED = 'finding resolved-confirmed';

/**
 * Statuses both engines keep evaluating. 'acknowledged' (reviewer disagreed / marked
 * resolved) stays live so it recurs instead of being duplicated — the same set is the
 * predicate of uq_fnd_open_entity_field.
 */
export const LIVE_FINDING_STATUSES = ['open', 'acknowledged'];

/** One row of ds.fn_create_finding_tasks(). */
export interface CreatedFindingTaskRow {
  fnd_id: number;
  win_id: string;
}

/** One row of ds.fn_close_resolved_finding_tasks(). */
export interface ClosedFindingTaskRow {
  fnd_id: number;
  win_id: string;
  wit_id: string;
  finding_status: string;
}

/** One row of ds.fn_run_state_rules() — column names kept as the function returns them. */
export interface StateRuleViolationDto {
  entity_id: string;
  field: string;
  rule_type: string;
  current_value: string | null;
  finding_action: string;
}

export interface RunStateRulesResultDto {
  violationsFound: number;
  findingsResolved: number;
  details: StateRuleViolationDto[];
  /** Review tasks created / closed by the same click (Findings Review Workflow). */
  tasksCreated: number;
  tasksClosed: number;
  /** Set when task sync failed; the run's own findings are already saved. */
  taskSyncError: string | null;
}
