import { Pool } from 'pg';
import { AppError } from '../../../errors/AppError';
import type {
  ProcedureSignatureDTO,
  ProcedureParameterSignatureDTO,
} from '@shared/dto/StoredProcedure';

const MODE_MAP: Record<string, ProcedureParameterSignatureDTO['mode']> = {
  i: 'in',
  o: 'out',
  b: 'inout',
};

export class ProcedureCatalog {
  constructor(private pool: Pool) {}

  async getSignature(schema: string, name: string): Promise<ProcedureSignatureDTO> {
    const procResult = await this.pool.query(
      `SELECT p.prokind, p.proargnames, p.proargtypes, p.proallargtypes, p.proargmodes
       FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = $1 AND p.proname = $2`,
      [schema, name],
    );

    if (procResult.rows.length === 0) {
      throw new AppError(`Procedure ${schema}.${name} not found`, 404);
    }

    const proc = procResult.rows[0];
    const prokind = proc.prokind as string;

    if (!['f', 'p'].includes(prokind)) {
      throw new AppError(`${schema}.${name} is not callable (kind: ${prokind})`, 400);
    }

    const kind = prokind === 'f' ? 'function' : 'procedure';

    // proallargtypes (oid[]) covers IN+OUT+INOUT; proargtypes (oidvector string) is IN-only.
    // pg driver returns oid[] as number[], oidvector as a space-separated string.
    const paramTypeOids: number[] = proc.proallargtypes
      ? (proc.proallargtypes as number[])
      : proc.proargtypes
        ? (proc.proargtypes as string).split(' ').filter(Boolean).map(Number)
        : [];

    if (paramTypeOids.length === 0) {
      return { kind, parameters: [] };
    }

    // pg driver returns char[] and text[] as JS string[] — no split() needed.
    const paramModes: string[] = (proc.proargmodes as string[] | null) ?? [];
    const paramNames: string[] = (proc.proargnames as string[] | null) ?? [];

    // Single batch query instead of one per parameter.
    const typeResult = await this.pool.query<{ oid: string; typname: string }>(
      'SELECT oid::text, typname FROM pg_type WHERE oid = ANY($1::oid[])',
      [paramTypeOids],
    );
    const typeMap = new Map(typeResult.rows.map((r) => [Number(r.oid), r.typname]));

    const parameters: ProcedureParameterSignatureDTO[] = paramTypeOids.map((oid, i) => ({
      parameterName: paramNames[i] ?? `param_${i + 1}`,
      pgType: typeMap.get(oid) ?? `oid:${oid}`,
      mode: MODE_MAP[paramModes[i] ?? ''] ?? 'in',
    }));

    return { kind, parameters };
  }
}
