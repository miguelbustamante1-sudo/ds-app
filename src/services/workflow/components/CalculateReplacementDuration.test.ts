import { describe, it, expect } from 'vitest';
import { calculateReplacementDuration } from './CalculateReplacementDuration';

describe('calculateReplacementDuration', () => {
  it('halves 8h to 4h at 50% reduction', () => {
    expect(calculateReplacementDuration(8, 0.5)).toBe(4);
  });

  it('halves 4h to 2h at 50% reduction', () => {
    expect(calculateReplacementDuration(4, 0.5)).toBe(2);
  });

  it('halves 2h to 1h at 50% reduction', () => {
    expect(calculateReplacementDuration(2, 0.5)).toBe(1);
  });

  it('rounds 3h at 50% (1.5h raw) up to 2h', () => {
    expect(calculateReplacementDuration(3, 0.5)).toBe(2);
  });

  it('floors any sub-1h result to 1h', () => {
    expect(calculateReplacementDuration(1, 0.9)).toBe(1);
  });

  it('applies a 100% reduction and still floors to 1h', () => {
    expect(calculateReplacementDuration(8, 1)).toBe(1);
  });
});
