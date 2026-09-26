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
  fieldDisplayName?: string;
  rulId: number | null;
  rulType: string | null;
  rulDefinition: unknown;
}

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

export interface FindingStatusCountDto {
  entityType: string;
  status: string;
  count: number;
}

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
