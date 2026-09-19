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
