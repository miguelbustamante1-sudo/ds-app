import { AppError } from '../../errors/AppError';

export class WorkflowNotFoundError extends AppError {
  constructor(message = 'Workflow template not found') {
    super(message, 404);
    this.name = 'WorkflowNotFoundError';
  }
}

export class WorkflowNotDraftError extends AppError {
  constructor(message = 'Template must be in DRAFT state') {
    super(message, 400);
    this.name = 'WorkflowNotDraftError';
  }
}

export class WorkflowNotPublishedError extends AppError {
  constructor(message = 'Template is not published') {
    super(message, 400);
    this.name = 'WorkflowNotPublishedError';
  }
}

export class WorkflowCodeConflictError extends AppError {
  constructor(message = 'A template with this code and version already exists') {
    super(message, 409);
    this.name = 'WorkflowCodeConflictError';
  }
}

export class WorkflowMissingStartTaskError extends AppError {
  constructor(message = 'Template must have at least one starting task') {
    super(message, 400);
    this.name = 'WorkflowMissingStartTaskError';
  }
}

export class WorkflowRoutingExpressionError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'WorkflowRoutingExpressionError';
  }
}

export class WorkflowInstanceNotFoundError extends AppError {
  constructor(message = 'Workflow instance not found') {
    super(message, 404);
    this.name = 'WorkflowInstanceNotFoundError';
  }
}

export class TaskNotActiveError extends AppError {
  constructor(message = 'Task is not in ACTIVE state') {
    super(message, 409);
    this.name = 'TaskNotActiveError';
  }
}

export class TaskNotFailedError extends AppError {
  constructor(message = 'Task is not in FAILED state') {
    super(message, 409);
    this.name = 'TaskNotFailedError';
  }
}

export class TaskInputValidationError extends AppError {
  constructor(message: string, public readonly fields?: string[]) {
    super(message, 400);
    this.name = 'TaskInputValidationError';
  }
}

export class TaskExecutionForbiddenError extends AppError {
  constructor(message = 'Not authorized to complete this task') {
    super(message, 403);
    this.name = 'TaskExecutionForbiddenError';
  }
}

export class TaskNotClaimableError extends AppError {
  constructor(message = 'Task is not role-assigned; claiming is not applicable') {
    super(message, 400);
    this.name = 'TaskNotClaimableError';
  }
}

export class TaskAlreadyClaimedError extends AppError {
  constructor(message = 'Task has already been claimed by another user') {
    super(message, 409);
    this.name = 'TaskAlreadyClaimedError';
  }
}

export class ReassignmentNotAllowedError extends AppError {
  constructor(message = 'This task does not allow reassignment') {
    super(message, 400);
    this.name = 'ReassignmentNotAllowedError';
  }
}

export class ReassignmentReasonRequiredError extends AppError {
  constructor(message = 'A reason is required for this reassignment') {
    super(message, 400);
    this.name = 'ReassignmentReasonRequiredError';
  }
}

export class TaskNotActiveForReassignError extends AppError {
  constructor(message = 'Task must be in ACTIVE state to be reassigned') {
    super(message, 409);
    this.name = 'TaskNotActiveForReassignError';
  }
}

export class WorkflowNotActiveError extends AppError {
  constructor(message = 'Workflow instance is not in ACTIVE state') {
    super(message, 409);
    this.name = 'WorkflowNotActiveError';
  }
}

export class AdminJumpTargetError extends AppError {
  constructor(message = 'Jump target task not found, not PENDING, or not in this instance') {
    super(message, 400);
    this.name = 'AdminJumpTargetError';
  }
}
