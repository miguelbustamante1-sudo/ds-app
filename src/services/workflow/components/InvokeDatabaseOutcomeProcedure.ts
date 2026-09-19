import { Prisma } from '@prisma/client';
import { DatabaseProcedureNotFoundError } from '../errors';

export interface InvokeDatabaseOutcomeProcedureInput {
  procName: string;
  winId: string;
  witId: string;
  outcomeCode: string;
  businessReferenceId: string | null;
  performedBy: string;
  performedByUserId: string;
  params: Record<string, unknown>;
}

export interface DatabaseOutcomeActivation {
  activated_wit_id: string | null;
  activated_user_id: number | null;
  // Optional audit snapshot of the domain mutation this procedure performed.
  // No domain procedure returns these yet (out of scope for this plan set) —
  // once one does, TaskCompletionOrchestrator logs them via auditOrchestrator.log
  // post-commit (Rule 3.4; this call path always has TypeScript present, so it
  // is not exempt the way the instantiate-procedure path is).
  entity_name?: string | null;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  comment?: string | null;
}

/**
 * Calls a DATABASE-type outcome's configured stored procedure (spec §4.1,
 * §4.2) inside the caller's transaction. The returned row's keys are
 * snake_case, matching Postgres's own column names verbatim — $queryRaw
 * never applies Prisma's camelCase model mapping to raw SQL results.
 */
export async function invokeDatabaseOutcomeProcedure(
  tx: Prisma.TransactionClient,
  input: InvokeDatabaseOutcomeProcedureInput,
): Promise<DatabaseOutcomeActivation | undefined> {
  const exists = await tx.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = ${input.procName}) AS exists
  `;
  if (!exists[0]?.exists) {
    throw new DatabaseProcedureNotFoundError(input.procName);
  }

  const rows = await tx.$queryRaw<DatabaseOutcomeActivation[]>(
    Prisma.sql`SELECT * FROM ${Prisma.raw(`ds."${input.procName}"`)}(
      ${input.winId}, ${input.witId}, ${input.outcomeCode}, ${input.businessReferenceId},
      ${input.performedBy}, ${input.performedByUserId}, ${JSON.stringify(input.params)}::jsonb
    )`,
  );
  return rows[0];
}
