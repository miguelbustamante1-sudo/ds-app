import { AppError } from '../../../errors/AppError';

export class TeamMemberByWorkdayIdNotFoundError extends AppError {
  constructor(workdayId: string) {
    super(`No team member found for workdayId "${workdayId}"`, 404);
    this.name = 'TeamMemberByWorkdayIdNotFoundError';
  }
}
