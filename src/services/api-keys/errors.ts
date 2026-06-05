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
