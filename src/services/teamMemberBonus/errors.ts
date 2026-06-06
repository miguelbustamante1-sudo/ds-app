import { AppError } from '../../errors/AppError';

export class TeamMemberBonusNotFoundError extends AppError {
  constructor() {
    super('Team member bonus not found', 404);
    this.name = 'TeamMemberBonusNotFoundError';
  }
}

export class TeamMemberBonusOverlapError extends AppError {
  constructor() {
    super(
      'A bonus of the same category already exists for this team member in an overlapping period',
      409,
    );
    this.name = 'TeamMemberBonusOverlapError';
  }
}
