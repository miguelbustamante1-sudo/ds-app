import jwt from 'jsonwebtoken';
import { AppError } from '../../../errors/AppError';

/**
 * Signs and verifies opaque tokens that stand in for Fuel iX thread/run IDs
 * on the wire. The client never sees a raw threadId/runId — only these
 * signed tokens, which embed the owning user's dsUserId. This closes two
 * gaps at once:
 *   1. A caller can't read or continue another user's Knowledge Base
 *      thread — verification checks the embedded dsUserId against the
 *      caller's own req.user.dsUserId.
 *   2. A caller can't manipulate the outbound Fuel iX request path —
 *      threadId/runId only ever reach FuelixCopilotClient after being
 *      extracted from a signature-verified token the server itself issued,
 *      never from raw, client-editable input.
 *
 * Reuses the same JWT_SECRET/jsonwebtoken already used for session auth
 * (src/middleware/auth.ts) — no new secret or dependency.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// A thread token (continues a conversation) lives for a whole Knowledge Base
// chat session; a run token (polls one answer) only needs to outlive the
// frontend's ~45s poll ceiling, with headroom.
const THREAD_TOKEN_EXPIRES_IN = '24h';
const RUN_TOKEN_EXPIRES_IN = '10m';

interface ThreadTokenPayload {
  kind: 'sop-ask-thread';
  threadId: string;
  dsUserId: number;
}

interface RunTokenPayload {
  kind: 'sop-ask-run';
  threadId: string;
  runId: string;
  dsUserId: number;
}

export function signThreadToken(threadId: string, dsUserId: number): string {
  const payload: ThreadTokenPayload = { kind: 'sop-ask-thread', threadId, dsUserId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: THREAD_TOKEN_EXPIRES_IN });
}

export function signRunToken(threadId: string, runId: string, dsUserId: number): string {
  const payload: RunTokenPayload = { kind: 'sop-ask-run', threadId, runId, dsUserId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: RUN_TOKEN_EXPIRES_IN });
}

/** Verifies a thread token belongs to dsUserId and returns the real threadId. */
export function verifyThreadToken(token: string, dsUserId: number): string {
  const decoded = decodeToken<ThreadTokenPayload>(token, 'sop-ask-thread');
  if (decoded.dsUserId !== dsUserId) {
    throw new AppError('You do not have access to this conversation.', 403);
  }
  return decoded.threadId;
}

/** Verifies a run token belongs to dsUserId and returns the real threadId/runId. */
export function verifyRunToken(token: string, dsUserId: number): { threadId: string; runId: string } {
  const decoded = decodeToken<RunTokenPayload>(token, 'sop-ask-run');
  if (decoded.dsUserId !== dsUserId) {
    throw new AppError('You do not have access to this conversation.', 403);
  }
  return { threadId: decoded.threadId, runId: decoded.runId };
}

function decodeToken<T extends { kind: string }>(token: string, expectedKind: T['kind']): T {
  let payload: unknown;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError('Invalid or expired conversation token.', 400);
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as Record<string, unknown>).kind !== expectedKind
  ) {
    throw new AppError('Invalid conversation token.', 400);
  }
  return payload as T;
}
