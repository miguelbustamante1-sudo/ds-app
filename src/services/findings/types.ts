export interface RunFindingsResultDto {
  runId: string;
  findingsCreated: number;
  findingsUpdated: number;
  entitiesCompared: number;
  fieldsChecked: number;
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
  fieldDisplayName?: string;
}

export interface DiffRow {
  entityId: string;
  fieldPath: string | null;
  changeType: 'added' | 'deleted' | 'modified';
  oldValue: unknown;
  newValue: unknown;
  fingerprint: string;
}

export interface WatchedField {
  fieldPath: string;
  displayName: string;
}
