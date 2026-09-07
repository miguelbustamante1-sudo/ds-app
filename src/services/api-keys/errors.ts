import { AppError } from '../../errors/AppError';

export class ApiKeyNotFoundError extends AppError {
  constructor() {
    super('API key not found', 404);
    this.name = 'ApiKeyNotFoundError';
  }
}

export class ApiKeyAlreadyRevokedError extends AppError {
  constructor() {
    super('API key is already revoked', 409);
    this.name = 'ApiKeyAlreadyRevokedError';
  }
}

export class ApiKeyHasBeenUsedError extends AppError {
  constructor() {
    super('Cannot delete a key that has been used — revoke it instead', 409);
    this.name = 'ApiKeyHasBeenUsedError';
  }
}

export class UnknownPermissionError extends AppError {
  constructor(resource: string, action: string) {
    super(`Unknown or inactive permission: ${resource}.${action}`, 400);
    this.name = 'UnknownPermissionError';
  }
}
