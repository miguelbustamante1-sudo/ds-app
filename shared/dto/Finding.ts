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
