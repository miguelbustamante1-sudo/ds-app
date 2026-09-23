// src/services/detection-rules/components/NormalizeRuleDefinition.test.ts
import { describe, it, expect } from 'vitest';
import { assertRuleType, normalizeRuleDefinition, sameDefinition } from './NormalizeRuleDefinition';
import { DetectionRuleValidationError } from '../errors';

describe('normalizeRuleDefinition', () => {
  it('keeps only the field for presence rules and trims it', () => {
    expect(normalizeRuleDefinition('required_not_null', { field: ' director ', min: 1, expected: true })).toEqual({
      field: 'director',
    });
  });

  it('requires a field', () => {
    expect(() => normalizeRuleDefinition('required_empty', { field: '  ' })).toThrow(DetectionRuleValidationError);
  });

  it('accepts numeric strings for range bounds and rejects min > max', () => {
    expect(normalizeRuleDefinition('range_check', { field: 'x', min: '0' as never, max: 10 })).toEqual({
      field: 'x',
      min: 0,
      max: 10,
    });
    expect(() => normalizeRuleDefinition('range_check', { field: 'x', min: 5, max: 1 })).toThrow('Min must be less');
  });

  it('rejects bounds the SQL ::numeric cast would fail on', () => {
    expect(() => normalizeRuleDefinition('range_check', { field: 'x', min: 'abc' as never, max: 1 })).toThrow(
      'Min must be a number',
    );
    expect(() => normalizeRuleDefinition('range_check', { field: 'x', min: 0 })).toThrow('Max must be a number');
  });

  it('requires a real boolean for boolean_equals', () => {
    expect(normalizeRuleDefinition('boolean_equals', { field: 'b', expected: false })).toEqual({
      field: 'b',
      expected: false,
    });
    expect(() => normalizeRuleDefinition('boolean_equals', { field: 'b', expected: 'true' as never })).toThrow(
      'Expected must be true or false',
    );
  });
});

describe('assertRuleType', () => {
  it('rejects types the rules function cannot evaluate', () => {
    expect(() => assertRuleType('regex_match')).toThrow(DetectionRuleValidationError);
  });
});

describe('sameDefinition', () => {
  it('ignores key order, which jsonb does not preserve', () => {
    expect(sameDefinition({ max: 1, min: 0, field: 'x' }, { field: 'x', min: 0, max: 1 })).toBe(true);
    expect(sameDefinition({ field: 'x', min: 0, max: 1 }, { field: 'x', min: 0, max: 2 })).toBe(false);
  });
});
