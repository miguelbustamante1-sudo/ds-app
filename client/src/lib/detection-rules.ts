import type { DetectionRuleConditionOperator, DetectionRuleType } from '@shared/dto';

export const RULE_TYPE_LABELS: Record<DetectionRuleType, string> = {
  required_not_null: 'Must be filled in',
  required_empty: 'Must be empty',
  range_check: 'Must be within a range',
  boolean_equals: 'Must equal true / false',
  required_when: 'Must be filled in when another field matches',
};

export const CONDITION_OPERATOR_LABELS: Record<DetectionRuleConditionOperator, string> = {
  equals: 'is',
  contains: 'contains',
  starts_with: 'starts with',
};

// Plain-English reading of a rul_detection_rules row, mirroring fn_run_state_rules semantics.
export function describeRule(ruleType: string, definition: unknown): string {
  const def = (definition ?? {}) as Record<string, unknown>;
  switch (ruleType) {
    case 'required_not_null':
      return 'Must be filled in';
    case 'required_empty':
      return 'Must be empty';
    case 'range_check':
      return `Must be between ${Number(def.min).toLocaleString()} and ${Number(def.max).toLocaleString()}`;
    case 'boolean_equals':
      return `Must be ${String(def.expected)}`;
    case 'required_when': {
      const when = (def.when ?? {}) as Record<string, unknown>;
      const operator = CONDITION_OPERATOR_LABELS[when.operator as DetectionRuleConditionOperator] ?? String(when.operator);
      return `Must be filled in when ${String(when.field)} ${operator} "${String(when.value)}"`;
    }
    default:
      return ruleType.replace(/_/g, ' ');
  }
}
