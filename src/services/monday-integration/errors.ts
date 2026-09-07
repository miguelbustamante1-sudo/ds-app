import { AppError } from '../../errors/AppError';

export class MondayConnectionNotFoundError extends AppError {
  constructor(message: string = 'Monday connection not found') {
    super(message, 404);
    this.name = 'MondayConnectionNotFoundError';
  }
}

export class MondayValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'MondayValidationError';
  }
}
