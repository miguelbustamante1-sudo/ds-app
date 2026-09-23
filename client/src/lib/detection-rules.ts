import type { DetectionRuleType } from '@shared/dto';

export const RULE_TYPE_LABELS: Record<DetectionRuleType, string> = {
  required_not_null: 'Must be filled in',
  required_empty: 'Must be empty',
  range_check: 'Must be within a range',
  boolean_equals: 'Must equal true / false',
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
    default:
      return ruleType.replace(/_/g, ' ');
  }
}
