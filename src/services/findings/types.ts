export interface RunFindingsResultDto {
  runId: string;
  runLogId: number;
  findingsCreated: number;
  findingsUpdated: number;
  findingsResolved: number;
  findingsSuperseded: number;
  entitiesCompared: number;
  fieldsChecked: number;
  observationsRecorded: number;
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

/** At most one per (entityId, fieldPath) — enforced by uq_fnd_open_entity_field. */
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
