import { AppError } from '../../errors/AppError';

export class DetectionRuleNotFoundError extends AppError {
  constructor(ruleId: number) {
    super(`Detection rule ${ruleId} not found`, 404);
    this.name = 'DetectionRuleNotFoundError';
  }
}

export class DetectionRuleValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'DetectionRuleValidationError';
  }
}

export class DuplicateDetectionRuleError extends AppError {
  constructor(entityType: string, ruleType: string, field: string) {
    super(`An active ${ruleType} rule already exists for ${entityType}.${field}`, 409);
    this.name = 'DuplicateDetectionRuleError';
  }
}
