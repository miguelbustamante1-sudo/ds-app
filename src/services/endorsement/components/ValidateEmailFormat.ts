import type { ValidationError } from './ValidateRequiredFields';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailFormat(email: string): ValidationError[] {
  if (!EMAIL_REGEX.test(email)) {
    return [{ field: 'clientManagerEmail', message: 'Invalid email format' }];
  }
  return [];
}
