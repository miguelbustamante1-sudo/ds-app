import { DETECTION_RULE_CONDITION_OPERATORS, DETECTION_RULE_SEVERITIES, DETECTION_RULE_TYPES } from '@shared/dto';
import type {
  DetectionRuleCondition,
  DetectionRuleConditionOperator,
  DetectionRuleDefinition,
  DetectionRuleSeverity,
  DetectionRuleType,
} from '@shared/dto';
import { DetectionRuleValidationError } from '../errors';

export function assertRuleType(value: unknown): DetectionRuleType {
  if (!(DETECTION_RULE_TYPES as readonly unknown[]).includes(value)) {
    throw new DetectionRuleValidationError(
      `Invalid rule type "${String(value)}". Allowed: ${DETECTION_RULE_TYPES.join(', ')}`,
    );
  }
  return value as DetectionRuleType;
}

export function assertSeverity(value: unknown): DetectionRuleSeverity {
  if (!(DETECTION_RULE_SEVERITIES as readonly unknown[]).includes(value)) {
    throw new DetectionRuleValidationError(
      `Invalid severity "${String(value)}". Allowed: ${DETECTION_RULE_SEVERITIES.join(', ')}`,
    );
  }
  return value as DetectionRuleSeverity;
}

function toFiniteNumber(value: unknown, label: string): number {
  const num = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new DetectionRuleValidationError(`${label} must be a number`);
  }
  return num;
}

/**
 * Builds the rul_definition ds.fn_run_state_rules() reads for the given type, keeping only
 * the keys that type uses. Anything the function would cast and fail on at run time
 * (a non-numeric min, a non-boolean expected) is rejected here instead.
 */
export function normalizeRuleDefinition(
  ruleType: DetectionRuleType,
  definition: Partial<DetectionRuleDefinition> | undefined,
): DetectionRuleDefinition {
  const field = typeof definition?.field === 'string' ? definition.field.trim() : '';
  if (!field) throw new DetectionRuleValidationError('Field is required');

  switch (ruleType) {
    case 'required_not_null':
    case 'required_empty':
      return { field };

    case 'range_check': {
      const min = toFiniteNumber(definition?.min, 'Min');
      const max = toFiniteNumber(definition?.max, 'Max');
      if (min > max) throw new DetectionRuleValidationError('Min must be less than or equal to max');
      return { field, min, max };
    }

    case 'boolean_equals': {
      if (typeof definition?.expected !== 'boolean') {
        throw new DetectionRuleValidationError('Expected must be true or false');
      }
      return { field, expected: definition.expected };
    }

    case 'required_when':
      return { field, when: normalizeCondition(field, definition?.when) };
  }
}

function normalizeCondition(field: string, when: Partial<DetectionRuleCondition> | undefined): DetectionRuleCondition {
  const conditionField = typeof when?.field === 'string' ? when.field.trim() : '';
  if (!conditionField) throw new DetectionRuleValidationError('Condition field is required');
  if (conditionField === field) {
    // A field that matches a condition is already filled in, so the rule could never fire.
    throw new DetectionRuleValidationError('Condition field must be different from the field that must be filled in');
  }

  if (!(DETECTION_RULE_CONDITION_OPERATORS as readonly unknown[]).includes(when?.operator)) {
    throw new DetectionRuleValidationError(
      `Invalid condition operator "${String(when?.operator)}". Allowed: ${DETECTION_RULE_CONDITION_OPERATORS.join(', ')}`,
    );
  }

  // Case-sensitive, so only surrounding whitespace is trimmed.
  const value = typeof when?.value === 'string' ? when.value.trim() : '';
  if (!value) throw new DetectionRuleValidationError('Condition value is required');

  return { field: conditionField, operator: when!.operator as DetectionRuleConditionOperator, value };
}

export function sameDefinition(a: DetectionRuleDefinition, b: DetectionRuleDefinition): boolean {
  return (
    a.field === b.field &&
    a.min === b.min &&
    a.max === b.max &&
    a.expected === b.expected &&
    a.when?.field === b.when?.field &&
    a.when?.operator === b.when?.operator &&
    a.when?.value === b.when?.value
  );
}
