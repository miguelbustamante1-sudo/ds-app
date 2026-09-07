import { AppError } from '../../errors/AppError';

export class IncomeTypeNotFoundError extends AppError {
  constructor() {
    super('Income type not found', 404);
    this.name = 'IncomeTypeNotFoundError';
  }
}

export class DuplicateIncomeTypeNameError extends AppError {
  constructor(name: string) {
    super(`An income type named "${name}" already exists`, 409);
    this.name = 'DuplicateIncomeTypeNameError';
  }
}

export class IncomeTypeInUseError extends AppError {
  constructor() {
    super('This income type is used by existing other-income entries and cannot be deleted; deactivate it instead', 409);
    this.name = 'IncomeTypeInUseError';
  }
}
