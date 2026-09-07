import { AppError } from '../../errors/AppError';

export class OtherIncomeNotFoundError extends AppError {
  constructor() {
    super('Other income record not found', 404);
    this.name = 'OtherIncomeNotFoundError';
  }
}

export class PayrolClosedError extends AppError {
  constructor() {
    super('This payrol period is closed; the record is read-only', 409);
    this.name = 'PayrolClosedError';
  }
}

export class NoAuthorizerAssignedError extends AppError {
  constructor(teamMemberWdid: string) {
    super(`No authorizer is assigned for team member ${teamMemberWdid}; contact PayrollAdmin`, 400);
    this.name = 'NoAuthorizerAssignedError';
  }
}

export class RejectionReasonRequiredError extends AppError {
  constructor() {
    super('A reason is required to reject this entry', 400);
    this.name = 'RejectionReasonRequiredError';
  }
}

export class ForbiddenOtherIncomeActionError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'ForbiddenOtherIncomeActionError';
  }
}
