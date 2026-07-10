import { AppError } from '../../errors/AppError';

export class GiftCardValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'GiftCardValidationError';
  }
}
