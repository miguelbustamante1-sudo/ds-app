import { AppError } from '../../errors/AppError';

export class TeamMemberReimbursementNotFoundError extends AppError {
  constructor() {
    super('Team member reimbursement not found', 404);
    this.name = 'TeamMemberReimbursementNotFoundError';
  }
}
