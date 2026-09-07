/**
 * Called at publish time.
 * With current schema (NONE / OUTCOME_ONLY only), always passes.
 */
export async function validateRoutingExpressions(_wflId: string): Promise<void> {
  // No expression-type routes exist in this schema version; nothing to validate.
}
