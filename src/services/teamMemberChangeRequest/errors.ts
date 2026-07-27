import { AppError } from '../../errors/AppError';

export class TeamMemberNotFoundError extends AppError {
  constructor() {
    super('Team member not found', 404);
    this.name = 'TeamMemberNotFoundError';
  }
}

export class ChangeRequestNotFoundError extends AppError {
  constructor() {
    super('Change request not found', 404);
    this.name = 'ChangeRequestNotFoundError';
  }
}

export class ChangeRequestNotPendingError extends AppError {
  constructor() {
    super('Only pending change requests can be reviewed', 400);
    this.name = 'ChangeRequestNotPendingError';
  }
}

export class NoRequestedChangesError extends AppError {
  constructor() {
    super('At least one field must be changed', 400);
    this.name = 'NoRequestedChangesError';
  }
}
