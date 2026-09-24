import { createThreadRun, checkRunStatus, getThreadMessages } from '../../sop/FuelixCopilotClient';
import { AppError } from '../../../errors/AppError';

export interface GeneratedTriviaQuestion {
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOptionIndex: number;
}

const REQUESTED_QUESTION_COUNT = 30;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // 100 * 3s = 5 minutes

function buildPrompt(existingQuestionTexts: string[]): string {
  const avoidList =
    existingQuestionTexts.length > 0
      ? `\n\nDo not repeat any of these existing questions:\n${existingQuestionTexts.map((q) => `- ${q}`).join('\n')}`
      : '';

  return `Generate up to ${REQUESTED_QUESTION_COUNT} multiple-choice trivia questions grounded strictly in the knowledge base content available to you.

STRICT GROUNDING RULE: Only produce questions whose answer is explicitly supported by the retrieved knowledge base content. Do not invent, infer, or assume any fact that is not directly stated in the source material. If fewer than ${REQUESTED_QUESTION_COUNT} genuinely grounded questions are possible, return fewer — returning fewer questions is correct and expected; fabricating questions to reach the count is not acceptable.

Output rules (STRICT):
- Return ONLY a JSON array. No prose, no explanations, no markdown code fences.
- Each element must be an object with exactly these keys:
    "question": string,
    "options": array of exactly 4 distinct strings,
    "correctOptionIndex": integer from 0 to 3 (0-based index into "options")
- Exactly one option is correct, identified by "correctOptionIndex".${avoidList}`;
}

export async function generateTriviaBatch(existingQuestionTexts: string[]): Promise<GeneratedTriviaQuestion[]> {
  const { threadId, runId } = await createThreadRun(buildPrompt(existingQuestionTexts));

  let attempts = 0;
  let status = await checkRunStatus(threadId, runId);
  while (status === 'pending') {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      throw new AppError('Trivia batch generation timed out waiting on Fuel iX', 502);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    status = await checkRunStatus(threadId, runId);
    attempts += 1;
  }

  const messages = await getThreadMessages(threadId);
  const answerMessage = messages.find((m) => m.role === 'assistant' && m.text.trim() !== '');
  if (!answerMessage) {
    throw new AppError('Fuel iX returned no trivia content', 502);
  }

  return parseTriviaBatchResponse(answerMessage.text);
}

function stripCodeFences(text: string): string {
  const fenced = text.trim();
  if (!fenced.startsWith('```')) return fenced;
  return fenced.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
}

interface RawTriviaQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

function isValidRawQuestion(item: unknown): item is RawTriviaQuestion {
  if (typeof item !== 'object' || item === null) return false;
  const q = item as Record<string, unknown>;

  if (typeof q.question !== 'string' || q.question.trim() === '') return false;

  if (
    !Array.isArray(q.options) ||
    q.options.length !== 4 ||
    !q.options.every((o) => typeof o === 'string' && o.trim() !== '')
  ) {
    return false;
  }

  if (
    typeof q.correctOptionIndex !== 'number' ||
    !Number.isInteger(q.correctOptionIndex) ||
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex > 3
  ) {
    return false;
  }

  return true;
}

export function parseTriviaBatchResponse(raw: string): GeneratedTriviaQuestion[] {
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

  const valid: GeneratedTriviaQuestion[] = parsed.filter(isValidRawQuestion).map((q) => ({
    questionText: q.question.trim(),
    option1: q.options[0] as string,
    option2: q.options[1] as string,
    option3: q.options[2] as string,
    option4: q.options[3] as string,
    correctOptionIndex: q.correctOptionIndex,
  }));

  if (valid.length === 0) {
    throw new AppError('Fuel iX returned no valid trivia questions', 502);
  }

  return valid;
}
