import { prisma } from '../../../../db/prisma';
import { getReportById } from '../../../../db/dynamicReports';
import { assertSqlSafe, extractParams } from './SqlSafetyGuard';
import type { ExecuteResponseDTO } from '@shared/dto/DynamicReport';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads the report definition, validates its SQL, substitutes user-supplied
 * values for {paramName} placeholders, and executes a paginated query.
 */
export async function executeSql(
  reportId: number,
  params: Record<string, string | number | boolean | null>,
  page: number,
  pageSize: number,
): Promise<ExecuteResponseDTO> {
  // Step 1: Load report definition
  const report = await getReportById(reportId);
  if (!report) {
    throw new Error(`Report ${reportId} not found.`);
  }

  // Step 2: Validate SQL (reject if tampered since creation)
  assertSqlSafe(report.reportSqlQuery);

  // Step 3: Get ordered placeholder list
  const placeholders = extractParams(report.reportSqlQuery);

  // Step 4 & 5: Build positional param values and replace {paramName} → $N
  const baseValues: unknown[] = [];
  let baseSql = report.reportSqlQuery;

  // Replace each placeholder in order, assigning $1, $2, ... positional params.
  // We need to process all occurrences in left-to-right order so indices align.
  // Build a mapping: placeholderName → $N (using first-occurrence order)
  const paramIndex = new Map<string, number>();
  placeholders.forEach((name, i) => {
    paramIndex.set(name, i + 1);
    const value = Object.prototype.hasOwnProperty.call(params, name) ? params[name] ?? null : null;
    baseValues.push(value);
  });

  // Replace all occurrences of {paramName} with the correct $N
  baseSql = baseSql.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_match, name: string) => {
    const idx = paramIndex.get(name);
    if (idx === undefined) return 'NULL';
    return `$${idx}`;
  });

  // Step 6 & 7: Count query
  const countSql = `SELECT COUNT(*)::int AS total FROM (${baseSql}) AS __count__`;
  const countResult = await prisma.$queryRawUnsafe<[{ total: number }]>(
    countSql,
    ...baseValues,
  );
  const total = Number(countResult[0]?.total ?? 0);

  // Step 6 & 7: Data query with pagination
  const offset = page * pageSize;
  const limitIdx = baseValues.length + 1;
  const offsetIdx = baseValues.length + 2;
  const dataSql = `${baseSql} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const dataValues = [...baseValues, pageSize, offset];

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    dataSql,
    ...dataValues,
  );

  // Step 8: Return ExecuteResponseDTO
  return {
    data: rows,
    total,
    page,
    pageSize,
  };
}
