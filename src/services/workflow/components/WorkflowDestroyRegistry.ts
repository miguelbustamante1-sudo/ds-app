import { Prisma } from '@prisma/client';

/**
 * Generic extension point on the workflow engine: lets a domain react when an
 * instance of one of its own entities is admin-destroyed, without the engine
 * knowing anything about that domain. Mirrors WorkflowOutcomeRegistry, which
 * covers the task-completion side of the same businessReferenceType link.
 */
export interface DestroyHandlerContext {
  /** The transaction the instance destruction itself is running in — mutate through this, not the global client, so the domain side effect is atomic with the instance's own state change. */
  tx: Prisma.TransactionClient;
  winId: string;
  businessReferenceId: string;
  reason: string;
  /** req.user.email of whoever destroyed the instance. */
  performedBy: string;
  /** req.user.dsUserId of whoever destroyed the instance, as a string. */
  performedByUserId: string;
}

/**
 * A handler may optionally return a callback to run after the enclosing
 * transaction commits — for work that must not run inside the transaction
 * (e.g. writing a changelog/audit record via the global Prisma client).
 */
export type DestroyHandler = (
  ctx: DestroyHandlerContext,
) => Promise<(() => Promise<void>) | undefined>;

const handlers = new Map<string, DestroyHandler>();

/** Registers the single destroy handler for a given businessReferenceType. Call once at startup. */
export function registerDestroyHandler(businessReferenceType: string, handler: DestroyHandler): void {
  handlers.set(businessReferenceType, handler);
}

export function getDestroyHandler(businessReferenceType: string): DestroyHandler | undefined {
  return handlers.get(businessReferenceType);
}
