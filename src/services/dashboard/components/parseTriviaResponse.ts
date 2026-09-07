import { AppError } from '../../../errors/AppError';
import type { TriviaQuestionDTO } from '@shared/dto';

/**
 * Parses and validates the raw Fuel iX response into TriviaQuestionDTO[].
 *
 * The model is instructed to return a bare JSON array, but LLMs occasionally
 * wrap output in ```json fences or add stray prose. We strip fences, parse,
 * then strictly validate each item against the DTO shape. Trivia has a rigid
 * contract, so we fail loudly (502) rather than return partial/garbage data.
 */
export function parseTriviaResponse(raw: string): TriviaQuestionDTO[] {
  const cleaned = stripCodeFences(raw).trim();

  if (!cleaned) {
    throw new AppError('Fuel iX returned no trivia content', 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError('Fuel iX returned invalid trivia JSON', 502);
  }

  if (!Array.isArray(parsed)) {
    throw new AppError('Fuel iX returned invalid trivia JSON', 502);
  }

  const valid = parsed.filter(isValidTriviaQuestion);

  if (valid.length === 0) {
    throw new AppError('Fuel iX returned no valid trivia questions', 502);
  }

  return valid;
}

/** Removes a surrounding ```json ... ``` (or ``` ... ```) fence if present. */
function stripCodeFences(text: string): string {
  const fenced = text.trim();
  if (!fenced.startsWith('```')) return fenced;
  return fenced
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function isValidTriviaQuestion(item: unknown): item is TriviaQuestionDTO {
  if (typeof item !== 'object' || item === null) return false;
  const q = item as Record<string, unknown>;

  if (typeof q.question !== 'string' || q.question.trim() === '') return false;

  if (
    !Array.isArray(q.options) ||
    q.options.length < 2 ||
    !q.options.every((o) => typeof o === 'string' && o.trim() !== '')
  ) {
    return false;
  }

  if (
    typeof q.correctOptionIndex !== 'number' ||
    !Number.isInteger(q.correctOptionIndex) ||
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex >= q.options.length
  ) {
    return false;
  }

  return true;
}
