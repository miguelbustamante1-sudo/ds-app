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
const RAW_RESPONSE_SNIPPET_LENGTH = 300;

function buildPrompt(existingQuestionTexts: string[]): string {
  const avoidList =
    existingQuestionTexts.length > 0
      ? `\n\nDo not repeat any of these existing questions:\n${existingQuestionTexts.map((q) => `- ${q}`).join('\n')}`
      : '';

  return `Generate up to ${REQUESTED_QUESTION_COUNT} multiple-choice trivia questions grounded strictly in the knowledge base content available to you.

STRICT GROUNDING RULE: Only produce questions whose answer is explicitly supported by the retrieved knowledge base content. Do not invent, infer, or assume any fact that is not directly stated in the source material. If fewer than ${REQUESTED_QUESTION_COUNT} genuinely grounded questions are possible, return fewer — returning fewer questions is correct and expected; fabricating questions to reach the count is not acceptable.

Format each question EXACTLY like this, as plain text (not JSON), one block per question:

Q: <question text>
A) <option text>
B) <option text>
C) <option text>
D) <option text>
CORRECT: <letter of the correct option, A, B, C, or D>
---

Produce one block per question, each separated by a line containing only ---. Do not add extra commentary, headings, numbering, or citations outside these blocks.${avoidList}`;
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

const QUESTION_LINE = /^Q:\s*(.+)$/i;
const OPTION_LINE = /^([A-D])\)\s*(.+)$/i;
const CORRECT_LINE = /^CORRECT:\s*([A-D])\s*$/i;

type OptionLetter = 'A' | 'B' | 'C' | 'D';

interface PartialQuestion {
  questionText: string;
  options: Partial<Record<OptionLetter, string>>;
}

function truncateForError(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > RAW_RESPONSE_SNIPPET_LENGTH
    ? `${trimmed.slice(0, RAW_RESPONSE_SNIPPET_LENGTH)}…`
    : trimmed;
}

/**
 * Parses the assistant's plain-text "Q: / A) / B) / C) / D) / CORRECT:"
 * blocks. Deliberately tolerant of prose, headings, citations, or code
 * fences appearing before/between/after blocks — the assistant is a
 * RAG-grounded Copilot, not a structured-output API, and reliably ignoring
 * noise around each block matters more than rejecting anything imperfect.
 */
export function parseTriviaBatchResponse(raw: string): GeneratedTriviaQuestion[] {
  if (!raw.trim()) {
    throw new AppError('Fuel iX returned no trivia content', 502);
  }

  const lines = raw.split('\n').map((line) => line.trim());
  const results: GeneratedTriviaQuestion[] = [];
  let current: PartialQuestion | null = null;

  for (const line of lines) {
    const questionMatch = line.match(QUESTION_LINE);
    if (questionMatch) {
      // QUESTION_LINE has one mandatory (non-optional) capture group, so a
      // successful match structurally guarantees group 1 is defined.
      current = { questionText: questionMatch[1]!.trim(), options: {} };
      continue;
    }

    if (!current) continue;

    const optionMatch = line.match(OPTION_LINE);
    if (optionMatch) {
      // OPTION_LINE has two mandatory capture groups; same guarantee as above.
      const letter = optionMatch[1]!.toUpperCase() as OptionLetter;
      current.options[letter] = optionMatch[2]!.trim();
      continue;
    }

    const correctMatch = line.match(CORRECT_LINE);
    if (correctMatch) {
      const { A, B, C, D } = current.options;
      if (current.questionText && A && B && C && D) {
        // CORRECT_LINE has one mandatory capture group; same guarantee as above.
        const letter = correctMatch[1]!.toUpperCase() as OptionLetter;
        results.push({
          questionText: current.questionText,
          option1: A,
          option2: B,
          option3: C,
          option4: D,
          correctOptionIndex: ['A', 'B', 'C', 'D'].indexOf(letter),
        });
      }
      current = null;
    }
  }

  if (results.length === 0) {
    throw new AppError(
      `Fuel iX returned no parseable trivia questions. Raw response: ${truncateForError(raw)}`,
      502,
    );
  }

  return results;
}
