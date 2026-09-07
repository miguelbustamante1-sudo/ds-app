import {
  createThreadRun,
  addMessageAndRun,
  checkRunStatus,
  getThreadMessages,
} from './FuelixCopilotClient';
import {
  signThreadToken,
  signRunToken,
  verifyThreadToken,
  verifyRunToken,
} from './components/SopAskToken';

export interface SopAskResult {
  /** Opaque, user-bound token — send back as-is to continue this conversation. */
  continuationToken: string;
  /** Opaque, user-bound token — poll GET /api/sop/ask/:pollToken with this. */
  pollToken: string;
  status: 'pending';
}

export interface SopAnswer {
  answer: string;
  sources: string[];
}

export interface SopPollResult {
  status: 'pending' | 'completed';
  answer?: SopAnswer;
}

/**
 * Starts (or continues, if `continuationToken` is given) a Fuel iX Copilot
 * run for the question and returns immediately — it does NOT wait for the
 * run to finish. Call `checkAnswer` (below) on an interval to find out when
 * it's done.
 *
 * `continuationToken` and the returned tokens are signed and bound to
 * `dsUserId` (see SopAskToken.ts) — callers never see or supply raw Fuel iX
 * threadId/runId values, so one user cannot read or continue another user's
 * conversation even if a token value were ever observed.
 */
export async function startQuestion(
  question: string,
  dsUserId: number,
  continuationToken?: string,
): Promise<SopAskResult> {
  const existingThreadId = continuationToken
    ? verifyThreadToken(continuationToken, dsUserId)
    : undefined;

  const { threadId, runId } = existingThreadId
    ? await addMessageAndRun(existingThreadId, question)
    : await createThreadRun(question);

  return {
    continuationToken: signThreadToken(threadId, dsUserId),
    pollToken: signRunToken(threadId, runId, dsUserId),
    status: 'pending',
  };
}

/**
 * Checks a run once. Returns `{ status: 'pending' }` if Fuel iX hasn't
 * finished yet, or `{ status: 'completed', answer }` once it has. Doesn't
 * loop or sleep — safe to call from a request handler on every poll.
 */
export async function checkAnswer(pollToken: string, dsUserId: number): Promise<SopPollResult> {
  const { threadId, runId } = verifyRunToken(pollToken, dsUserId);

  const status = await checkRunStatus(threadId, runId);
  if (status !== 'completed') {
    return { status };
  }

  // Fuel iX returns messages newest-first, interleaved with empty/tool
  // messages emitted mid-run — the first non-empty assistant message is the
  // final answer.
  const messages = await getThreadMessages(threadId);
  const answerMessage = messages.find((m) => m.role === 'assistant' && m.text.trim() !== '');

  return {
    status,
    answer: {
      answer: answerMessage?.text ?? "I couldn't generate a response. Please try again.",
      sources: [],
    },
  };
}
