export interface TaskInboxItem {
  witId: string;
  witName: string;
  winId: string;
  winName: string;
  priority: string;
  dueAt: string | null;
  state: string;
  outcomeCode: string | null;
  isOverdue: boolean;
  assignmentType: string;
  isClaimed: boolean;
  isClaimedByMe: boolean;
  claimedByUserId: string | null;
  entityUrl: string | null;
  entitySummary: string | null;
}

export interface WitInstanceTask {
  witId: string;
  winId: string;
  wtkId: string | null;
  code: string;
  name: string;
  description: string | null;
  taskType: string;
  assignmentType: string;
  assignedUserId: string | null;
  assignedRoleId: string | null;
  resolvedUserId: string | null;
  priority: string;
  state: string;
  dueAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  outcomeCode: string | null;
  resultComment: string | null;
  retryCount: number;
  maxRetryCount: number;
  slaDurationHours: number | null;
  inputs?: WiiInstanceInput[];
  outcomes?: WtoTaskOutcome[];
  entityUrl: string | null;
  entitySummary: string | null;
  // Generic flattened wic_workflow_instance_context bag — the engine has no
  // idea what any key means. Domain-specific procedures decide what's under
  // it (e.g. Team Member Change Auth's 'changedFields'); this frontend only
  // renders keys it specifically recognizes, everything else is ignored.
  context?: Record<string, unknown>;
}

export interface ChangedFieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface WtoTaskOutcome {
  wtoId: string;
  wtkId: string;
  code: string;
  label: string;
  description: string | null;
  isTerminal: boolean;
}

export interface WiiInstanceInput {
  wiiId: string;
  witId: string;
  code: string;
  label: string;
  description: string | null;
  dataType: string;
  isRequired: boolean;
  isRoutingInput: boolean;
  displayOrder: number;
  defaultValue: string | null;
  optionSetJson: unknown;
  inputValues?: WivInputValue[];
}

export interface WivInputValue {
  wivId: string;
  wiiId: string;
  attemptNo: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueDatetime: string | null;
}

export interface WinInstance {
  winId: string;
  workflowCode: string;
  name: string;
  status: string;
  startedAt: string;
  startedBy: string | null;
  completedAt: string | null;
  ownerUserId: string | null;
}
