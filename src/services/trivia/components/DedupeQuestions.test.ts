import { describe, it, expect } from 'vitest';
import { normalizeQuestionText, computeQuestionHash, dedupeAgainstExisting } from './DedupeQuestions';
import type { GeneratedTriviaQuestion } from './GenerateTriviaBatch';

describe('normalizeQuestionText', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeQuestionText('  What   is   the   PTO policy?  ')).toBe('what is the pto policy?');
  });
});

describe('computeQuestionHash', () => {
  it('produces the same hash for questions differing only in case/whitespace', () => {
    const a = computeQuestionHash('What is the PTO policy?');
    const b = computeQuestionHash('  what is the pto policy?  ');
    expect(a).toBe(b);
  });

  it('produces different hashes for different questions', () => {
    const a = computeQuestionHash('What is the PTO policy?');
    const b = computeQuestionHash('What is the holiday swap policy?');
    expect(a).not.toBe(b);
  });
});

describe('dedupeAgainstExisting', () => {
  const makeQuestion = (text: string): GeneratedTriviaQuestion => ({
    questionText: text,
    option1: 'A',
    option2: 'B',
    option3: 'C',
    option4: 'D',
    correctOptionIndex: 0,
  });

  it('drops candidates matching an existing hash', () => {
    const existingHash = computeQuestionHash('What is the PTO policy?');
    const candidates = [makeQuestion('What is the PTO policy?'), makeQuestion('What is the holiday swap policy?')];

    const result = dedupeAgainstExisting(candidates, new Set([existingHash]));

    expect(result).toHaveLength(1);
    expect(result[0]?.questionText).toBe('What is the holiday swap policy?');
  });

  it('drops duplicate candidates within the same batch, keeping the first', () => {
    const candidates = [makeQuestion('What is the PTO policy?'), makeQuestion('what is the pto policy?')];

    const result = dedupeAgainstExisting(candidates, new Set());

    expect(result).toHaveLength(1);
  });

  it('attaches the computed questionHash to each surviving question', () => {
    const candidates = [makeQuestion('What is the PTO policy?')];

    const result = dedupeAgainstExisting(candidates, new Set());

    expect(result[0]?.questionHash).toBe(computeQuestionHash('What is the PTO policy?'));
  });
});
