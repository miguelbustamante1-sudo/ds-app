import { Pool } from 'pg';
import { AppError } from '../../../errors/AppError';
import type { ProcedureSignatureDTO } from '@shared/dto/StoredProcedure';

export class ProcedureCatalog {
  constructor(private pool: Pool) {}

  /**
   * Introspect a procedure/function in the given schema.
   * Returns its kind ('function' or 'procedure') and ordered parameter list.
   * Throws AppError if not found or not callable.
   */
  async getSignature(schema: string, name: string): Promise<ProcedureSignatureDTO> {
    // Step 1: Find the procedure in pg_proc
    const procResult = await this.pool.query(
      `
        SELECT p.prokind, p.proname, p.proargnames, p.proargtypes, p.proargmodes
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = $1 AND p.proname = $2
      `,
      [schema, name],
    );

    if (procResult.rows.length === 0) {
      throw new AppError(`Procedure ${schema}.${name} not found`, 404);
    }

    const proc = procResult.rows[0];
    const prokind = proc.prokind as string;

    // Step 2: Reject non-callable kinds
    if (!['f', 'p'].includes(prokind)) {
      throw new AppError(`${schema}.${name} is not callable (kind: ${prokind})`, 400);
    }

    // Step 3: Decode parameter info
    const kind = prokind === 'f' ? 'function' : 'procedure';
    const paramNames = proc.proargnames || [];
    const paramTypeOids: number[] = proc.proargtypes ? proc.proargtypes.split(' ').map(Number) : [];
    const paramModes = proc.proargmodes?.split('') || [];

    const parameters = [];
    for (let i = 0; i < paramTypeOids.length; i++) {
      const oid = paramTypeOids[i];
      const mode = paramModes[i] || 'i'; // default to 'in'

      // Look up the type name
      const typeResult = await this.pool.query(
        'SELECT typname FROM pg_type WHERE oid = $1',
        [oid],
      );
      const pgType = typeResult.rows[0]?.typname || `oid:${oid}`;

      const paramName = paramNames[i] || `param_${i + 1}`;

      parameters.push({
        parameterName: paramName,
        pgType,
        mode: mode as 'in' | 'out' | 'inout',
      });
    }

    return { kind, parameters };
  }
}
