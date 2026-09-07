import { AppError } from '../../errors/AppError';

export class GiftCardValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'GiftCardValidationError';
  }
}

export class InsufficientInventoryError extends AppError {
  constructor(needed: number, found: number, cardTypeName: string, cardValueAmount: number) {
    super(
      `Card selection failed: ${found} available card(s) of type "${cardTypeName}" ($${cardValueAmount}) ` +
      `but ${needed} required. Please notify the system administrator.`,
      422,
    );
    this.name = 'InsufficientInventoryError';
  }
}
