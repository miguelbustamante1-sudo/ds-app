import { Pool } from 'pg';
import type { ExecuteStoredProcedureResponseDTO } from '@shared/dto/StoredProcedure';

/**
 * Executes a stored procedure or function with positionally-bound parameters.
 */
export class ProcedureExecutor {
  constructor(private pool: Pool) {}

  /**
   * Execute a procedure/function.
   * @param schema e.g. 'ds'
   * @param name e.g. 'fn_my_func'
   * @param paramNames ordered list of parameter names (order must match Postgres signature)
   * @param params Record of paramName → value (only values for paramNames are used, in order)
   * @param kind 'function' (default) or 'procedure' (determines CALL vs SELECT)
   */
  async execute(
    schema: string,
    name: string,
    paramNames: string[],
    params: Record<string, string | number | boolean | null>,
    kind: 'function' | 'procedure' = 'function',
  ): Promise<ExecuteStoredProcedureResponseDTO> {
    try {
      // Build positional parameter array
      const values = paramNames.map((pname) => params[pname] ?? null);

      // Build placeholders: $1, $2, ...
      const placeholders = Array.from({ length: paramNames.length }, (_, i) => `$${i + 1}`).join(', ');

      // Build SQL
      let sql: string;
      if (kind === 'procedure') {
        sql = `CALL "${schema}"."${name}"(${placeholders})`;
      } else {
        sql = `SELECT "${schema}"."${name}"(${placeholders})`;
      }

      // Execute
      await this.pool.query(sql, values);

      const message = kind === 'procedure'
        ? 'Procedure executed successfully'
        : 'Function executed successfully';

      return { success: true, message };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Execution failed: ${errorMsg}` };
    }
  }
}
