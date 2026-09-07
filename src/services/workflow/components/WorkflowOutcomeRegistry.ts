import { Prisma } from '@prisma/client';

/**
 * Generic extension point on the workflow engine: lets a domain react when a
 * task belonging to one of its own entities is completed, without the engine
 * knowing anything about that domain.
 *
 * The engine only knows "there is a business reference type string; call
 * whatever's registered for it, if the completed outcome is flagged
 * wto_triggers_outcome_action" (checked by TaskCompletionOrchestrator before
 * invoking the handler — see WtoWorkflowTemplateTaskOutcome.triggersOutcomeAction).
 * What a given outcome code means for the domain (e.g. which status it maps
 * to) lives entirely inside the registered handler.
 */
export interface OutcomeHandlerContext {
  /** The transaction the task completion itself is running in — mutate through this, not the global client, so the domain side effect is atomic with the task's own state change. */
  tx: Prisma.TransactionClient;
  winId: string;
  witId: string;
  /** The instance task's code, copied from its template task at instantiation. */
  taskCode: string;
  outcomeCode: string;
  businessReferenceId: string;
  /** req.user.email of whoever completed the task. */
  performedBy: string;
  /** req.user.dsUserId of whoever completed the task, as a string. */
  performedByUserId: string;
}

/**
 * A handler may optionally return a callback to run after the enclosing
 * transaction commits — for work that must not run inside the transaction
 * (e.g. writing a changelog/audit record via the global Prisma client).
 */
export type OutcomeHandler = (
  ctx: OutcomeHandlerContext,
) => Promise<(() => Promise<void>) | undefined>;

const handlers = new Map<string, OutcomeHandler>();

/** Registers the single handler for a given businessReferenceType. Call once at startup. */
export function registerOutcomeHandler(businessReferenceType: string, handler: OutcomeHandler): void {
  handlers.set(businessReferenceType, handler);
}

export function getOutcomeHandler(businessReferenceType: string): OutcomeHandler | undefined {
  return handlers.get(businessReferenceType);
}
