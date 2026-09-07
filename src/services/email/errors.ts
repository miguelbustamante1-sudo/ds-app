import { AppError } from '../../errors/AppError';

export class MessageInsightsNotFoundError extends AppError {
  constructor(messageId: string) {
    super(`No delivery insights found for message ${messageId}`, 404);
    this.name = 'MessageInsightsNotFoundError';
  }
}
