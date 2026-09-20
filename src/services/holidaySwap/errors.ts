import { AppError } from '../../errors/AppError';

export class HolidaySwapNotFoundError extends AppError {
  constructor() {
    super('Holiday swap not found.', 404);
    this.name = 'HolidaySwapNotFoundError';
  }
}

export class HolidaySwapAccessDeniedError extends AppError {
  constructor() {
    super('Access denied.', 403);
    this.name = 'HolidaySwapAccessDeniedError';
  }
}

export class InvalidHolidaySwapIdError extends AppError {
  constructor() {
    super('Invalid swap ID.', 400);
    this.name = 'InvalidHolidaySwapIdError';
  }
}

export class MissingTeamMemberIdError extends AppError {
  constructor() {
    super('Team member ID not found on authenticated user.', 400);
    this.name = 'MissingTeamMemberIdError';
  }
}
