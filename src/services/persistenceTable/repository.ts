/**
 * Persistence Table - Repository (Data Access Layer)
 *
 * Responsibility: raw data access for persistence tables.
 *
 * Queries information_schema.columns for the 'es' schema, groups rows by
 * table name, and maps is_nullable ('YES'/'NO') to a boolean.
 *
 * Pagination is applied at the table level (not the column level):
 *   page=1, limit=10 returns the first 10 tables with all their columns.
 */

import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import type { PersistenceTable, PersistenceTableColumn } from '../../../shared/dto/PersistenceTable';

// --- Schema -------------------------------------------------------------------

/** The database schema from which persistence tables are read. */
const PERSISTENCE_SCHEMA = 'es';

// --- Pagination ---------------------------------------------------------------

export interface PaginationOptions {
  /** 1-based page number (default: 1) */
  page: number;
  /** Items per page (default: 10, max: 100) */
  limit: number;
}

// --- Internal raw row type ----------------------------------------------------

interface RawColumnRow {
  table_name: string;
  ordinal_position: number;
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;          // 'YES' or 'NO'
  column_default: string | null;
}

// --- Query functions ----------------------------------------------------------

/**
 * Returns a paginated list of tables in the 'es' schema, each with their
 * columns ordered by ordinal position.
 *
 * Pagination is table-level: the query first discovers all distinct table
 * names (ordered alphabetically), slices the requested page, then fetches
 * columns only for those tables.
 */
export async function getAllPersistenceTables(
  pagination: PaginationOptions
): Promise<PersistenceTable[]> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Step 1 - get the paginated slice of table names
  const tableNames = await prisma.$queryRaw<Array<{ table_name: string }>>(
    Prisma.sql`
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = ${PERSISTENCE_SCHEMA}
      ORDER BY table_name
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  if (tableNames.length === 0) return [];

  // Step 2 - fetch all columns for those tables in a single query
  const names: string[] = tableNames.map((r: { table_name: string }) => r.table_name);

  const rows = await prisma.$queryRaw<RawColumnRow[]>(
    Prisma.sql`
      SELECT
        table_name,
        ordinal_position,
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable::text AS is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = ${PERSISTENCE_SCHEMA}
        AND table_name = ANY(${names})
      ORDER BY table_name, ordinal_position
    `
  );

  // Step 3 - group columns by table name preserving the sorted table order
  const columnsByTable = new Map<string, PersistenceTableColumn[]>();
  for (const name of names) {
    columnsByTable.set(name, []);
  }

  for (const row of rows) {
    const cols = columnsByTable.get(row.table_name);
    if (!cols) continue;

    cols.push({
      index:            row.ordinal_position,
      name:             row.column_name,
      type:             row.data_type,
      length:           row.character_maximum_length ?? null,
      allowNull:        row.is_nullable === 'YES',
      numericPrecision: row.numeric_precision ?? null,
      numericScale:     row.numeric_scale ?? null,
      default:          row.column_default ?? null,
    });
  }

  // Step 4 - build the result array in the same order as the paginated names
  return names.map((name) => ({
    schema:  PERSISTENCE_SCHEMA,
    name,
    columns: columnsByTable.get(name) ?? [],
  }));
}
