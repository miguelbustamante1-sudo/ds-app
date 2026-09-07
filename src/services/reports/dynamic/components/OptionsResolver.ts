import { prisma } from '../../../../db/prisma';
import { getReportById } from '../../../../db/dynamicReports';
import { assertSqlSafe } from './SqlSafetyGuard';
import type { SelectOptions } from '@shared/dto/DynamicReport';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolves the selectable options for a given parameter of a report.
 * For static options, returns them directly.
 * For query-driven options, executes the lookup SQL and maps rows to {value, label}.
 */
export async function resolveOptions(
  reportId: number,
  paramName: string,
): Promise<{ value: string; label: string }[]> {
  const report = await getReportById(reportId);
  if (!report) {
    throw new Error(`Report ${reportId} not found.`);
  }

  const param = report.parameters.find((p) => p.parameterName === paramName);
  if (!param) {
    throw new Error(`Parameter '${paramName}' not found in report ${reportId}.`);
  }

  if (!param.parameterOptions) {
    return [];
  }

  let selectOptions: SelectOptions;
  try {
    selectOptions = JSON.parse(param.parameterOptions) as SelectOptions;
  } catch {
    throw new Error(`Invalid options definition for parameter '${paramName}'.`);
  }

  if (selectOptions.source === 'static') {
    return selectOptions.options;
  }

  // Query-driven options
  assertSqlSafe(selectOptions.query);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(selectOptions.query);

  return rows.map((row) => ({
    value: String(row['value'] ?? ''),
    label: String(row['label'] ?? ''),
  }));
}
