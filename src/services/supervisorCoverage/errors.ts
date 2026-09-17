import { AppError } from '../../errors/AppError';

export class SupervisorCoverageChainError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'SupervisorCoverageChainError';
  }
}

export class SupervisorCoverageNotFoundError extends AppError {
  constructor(message: string = 'Supervisor coverage record not found') {
    super(message, 404);
    this.name = 'SupervisorCoverageNotFoundError';
  }
}

export class SupervisorCoverageAlreadyEndedError extends AppError {
  constructor(message: string = 'This coverage has already ended') {
    super(message, 409);
    this.name = 'SupervisorCoverageAlreadyEndedError';
  }
}
