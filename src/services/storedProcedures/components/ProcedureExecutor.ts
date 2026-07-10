import { Pool } from 'pg';
import type { ExecuteStoredProcedureResponseDTO } from '@shared/dto/StoredProcedure';

export class ProcedureExecutor {
  constructor(private pool: Pool) {}

  async execute(
    schema: string,
    name: string,
    paramNames: string[],
    params: Record<string, string | number | boolean | null>,
    kind: 'function' | 'procedure' = 'function',
  ): Promise<ExecuteStoredProcedureResponseDTO> {
    const values = paramNames.map((pname) => params[pname] ?? null);
    const placeholders = Array.from({ length: paramNames.length }, (_, i) => `$${i + 1}`).join(', ');

    const sql =
      kind === 'procedure'
        ? `CALL "${schema}"."${name}"(${placeholders})`
        : `SELECT "${schema}"."${name}"(${placeholders})`;

    await this.pool.query(sql, values);

    const message =
      kind === 'procedure' ? 'Procedure executed successfully' : 'Function executed successfully';

    return { success: true, message };
  }
}
