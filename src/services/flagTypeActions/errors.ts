import { AppError } from '../../errors/AppError';

export class FlagTypeActionNotFoundError extends AppError {
  constructor() {
    super('Flag type action not found', 404);
    this.name = 'FlagTypeActionNotFoundError';
  }
}

export class DuplicateFlagTypeActionCategoryError extends AppError {
  constructor(category: string) {
    super(`A flag type action for category "${category}" already exists`, 409);
    this.name = 'DuplicateFlagTypeActionCategoryError';
  }
}
