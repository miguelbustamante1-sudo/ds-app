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
  isClaimed: boolean;
  isClaimedByMe: boolean;
  claimedByUserId: string | null;
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
