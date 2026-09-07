import { AppError } from '../../errors/AppError';

export class TeamMemberOncallNotFoundError extends AppError {
  constructor() {
    super('Team member on call record not found', 404);
    this.name = 'TeamMemberOncallNotFoundError';
  }
}
