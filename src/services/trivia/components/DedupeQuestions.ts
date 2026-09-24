import { createHash } from 'crypto';
import type { GeneratedTriviaQuestion } from './GenerateTriviaBatch';

export function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeQuestionHash(text: string): string {
  return createHash('sha256').update(normalizeQuestionText(text)).digest('hex');
}

export interface DedupedQuestion extends GeneratedTriviaQuestion {
  questionHash: string;
}

export function dedupeAgainstExisting(
  candidates: GeneratedTriviaQuestion[],
  existingHashes: Set<string>,
): DedupedQuestion[] {
  const seenInBatch = new Set<string>();
  const result: DedupedQuestion[] = [];

  for (const candidate of candidates) {
    const questionHash = computeQuestionHash(candidate.questionText);
    if (existingHashes.has(questionHash) || seenInBatch.has(questionHash)) {
      continue;
    }
    seenInBatch.add(questionHash);
    result.push({ ...candidate, questionHash });
  }

  return result;
}
