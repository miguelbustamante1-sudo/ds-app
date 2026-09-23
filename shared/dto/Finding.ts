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

export interface FindingStatusCountDto {
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
}
