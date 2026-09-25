export interface WflWorkflowTemplate {
  wflId: string;
  code: string;
  name: string;
  description: string | null;
  versionNo: number;
  status: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  wecId: string | null;
  executionType: string;
  instantiateProcName: string | null;
  tasks?: WtkWorkflowTemplateTask[];
  routes?: WtrWorkflowTemplateRoute[];
  dependencies?: WtdWorkflowTemplateDependency[];
}

export interface WtkWorkflowTemplateTask {
  wtkId: string;
  wflId: string;
  code: string;
  name: string;
  description: string | null;
  sequenceNo: number | null;
  taskType: string;
  assignmentType: string;
  assignedUserId: number | null;
  assignedRoleId: string | null;
  dynamicAssignmentType: string | null;
  priority: string;
  slaDurationHours: number | null;
  escalationUserId: number | null;
  escalationRoleId: string | null;
  escalationDynamicType: string | null;
  deadlineAction: string;
  reductionPercentage: number | null;
  replacementLimit: number | null;
  maxRetryCount: number;
  allowReassignment: boolean;
  requireCommentOnReassign: boolean;
  allowFail: boolean;
  isStartingTask: boolean;
  isActive: boolean;
  inputs?: WtiWorkflowTemplateTaskInput[];
  outcomes?: WtoWorkflowTemplateTaskOutcome[];
  notifications?: WtnWorkflowTemplateNotification[];
}

export interface WtiWorkflowTemplateTaskInput {
  wtiId: string;
  wtkId: string;
  code: string;
  label: string;
  description: string | null;
  dataType: string;
  isRequired: boolean;
  isRoutingInput: boolean;
  displayOrder: number;
  defaultValue: string | null;
  validationRule: string | null;
  optionSetJson: unknown;
}

export interface WtoWorkflowTemplateTaskOutcome {
  wtoId: string;
  wtkId: string;
  code: string;
  label: string;
  description: string | null;
  isTerminal: boolean;
  triggersOutcomeAction: boolean;
  executionType: string;
  outcomeProcName: string | null;
}

export interface WtrWorkflowTemplateRoute {
  wtrId: string;
  wflId: string;
  wtkFromId: string;
  wtoId: string | null;
  wtkToId: string;
  conditionType: string;
  routeOrder: number;
}

export interface WtdWorkflowTemplateDependency {
  wtdId: string;
  wflId: string;
  wtkPredecessorId: string;
  wtkSuccessorId: string;
  dependencyType: string;
  joinGroupCode: string | null;
  isRequired: boolean;
}

export interface WtnWorkflowTemplateNotification {
  wtnId: string;
  wtkId: string;
  eventType: string;
  recipientType: string;
  recipientUserId: string | null;
  recipientRoleId: string | null;
  recipientDynamicType: string | null;
  messageTemplate: string;
  emailTemplate: string | null;
  slackTemplate: string | null;
  isActive: boolean;
}

export interface WinWorkflowInstance {
  winId: string;
  wflId: string;
  workflowCode: string;
  templateVersionNo: number;
  name: string;
  status: string;
  startedAt: string;
  startedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  destroyedAt: string | null;
  destroyedBy: string | null;
  destructionReason: string | null;
  forcedCompletedAt: string | null;
  forcedCompletedBy: string | null;
  forcedCompletionReason: string | null;
  ownerUserId: string | null;
  businessReferenceType: string | null;
  businessReferenceId: string | null;
  createdAt: string;
  tasks?: WitAdminTask[];
}

export interface WitAdminTask {
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
  overrideReason: string | null;
  overriddenAt: string | null;
  overriddenBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  originalTaskId: string | null;
  previousTaskId: string | null;
  attemptNumber: number;
  remainingReplacements: number | null;
  missedResolvedAt: string | null;
}

export interface WalAuditEntry {
  walId: string;
  winId: string;
  witId: string | null;
  eventType: string;
  eventTimestamp: string;
  performedBy: string | null;
  reason: string | null;
  oldState: string | null;
  newState: string | null;
  detailsJson: unknown;
}
