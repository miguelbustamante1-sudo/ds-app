/** Rule types ds.fn_run_state_rules() knows how to evaluate. */
export const DETECTION_RULE_TYPES = [
  'required_not_null',
  'required_empty',
  'range_check',
  'boolean_equals',
  'required_when',
] as const;
export type DetectionRuleType = (typeof DETECTION_RULE_TYPES)[number];

/** How required_when compares the condition field. All case-sensitive. */
export const DETECTION_RULE_CONDITION_OPERATORS = ['equals', 'contains', 'starts_with'] as const;
export type DetectionRuleConditionOperator = (typeof DETECTION_RULE_CONDITION_OPERATORS)[number];

/** required_when: the rule applies only when another field matches this. */
export interface DetectionRuleCondition {
  field: string;
  operator: DetectionRuleConditionOperator;
  value: string;
}

export const DETECTION_RULE_SEVERITIES = ['low', 'medium', 'high'] as const;
export type DetectionRuleSeverity = (typeof DETECTION_RULE_SEVERITIES)[number];

/**
 * Shape of rul_definition. min/max apply to range_check only, expected to boolean_equals
 * only, when to required_when only.
 */
export interface DetectionRuleDefinition {
  field: string;
  min?: number;
  max?: number;
  expected?: boolean;
  when?: DetectionRuleCondition;
}

export interface DetectionRuleDto {
  ruleId: number;
  entityType: string;
  ruleClass: string;
  ruleType: DetectionRuleType;
  definition: DetectionRuleDefinition;
  severity: DetectionRuleSeverity;
  version: number;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  openFindingCount: number;
}

export interface CreateDetectionRuleDto {
  entityType: string;
  ruleType: DetectionRuleType;
  definition: DetectionRuleDefinition;
  severity: DetectionRuleSeverity;
}

/**
 * entityType and definition.field are create-only: open findings are keyed by
 * (entity, field, rule), so moving a rule to another field would strand them.
 * Turn the rule off and create a new one instead.
 */
export interface UpdateDetectionRuleDto {
  ruleType?: DetectionRuleType;
  definition?: DetectionRuleDefinition;
  severity?: DetectionRuleSeverity;
}

export interface SetDetectionRuleActiveDto {
  active: boolean;
}

/** Turning a rule off closes its open findings as 'rule_retired'; findingsRetired counts them. */
export interface SetDetectionRuleActiveResultDto {
  rule: DetectionRuleDto;
  findingsRetired: number;
}
