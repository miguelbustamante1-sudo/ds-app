/**
 * Persistence Template - Repository (Data Access Layer)
 *
 * Responsibility: raw data access for persistence templates.
 */

import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import { info } from '../../logger';
import type {
  CreatePersistenceTemplateColumnInput,
  CreatePersistenceTemplateInput,
  UpdatePersistenceTemplateInput,
} from '../../../shared/dto/PersistenceTemplate';
import {
  ErrorHandlingStrategy,
  DuplicatesHandlingStrategy,
} from '../../../shared/dto/PersistenceTemplate';
export { ErrorHandlingStrategy, DuplicatesHandlingStrategy };

/** Default strategy applied when none is provided by the caller. */
export const DEFAULT_ERROR_HANDLING_STRATEGY: ErrorHandlingStrategy =
  ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_ROLLBACK;

/** Returns true if the value is a valid ErrorHandlingStrategy. */
export function isValidErrorHandlingStrategy(value: unknown): value is ErrorHandlingStrategy {
  return Object.values(ErrorHandlingStrategy).includes(value as ErrorHandlingStrategy);
}

/**
 * Checks whether a table with the given name exists in the database by querying
 * information_schema.tables.  The check is case-insensitive and scoped to
 * 'BASE TABLE' rows (i.e. actual tables, not views).
 *
 * `async` is required because the lookup hits the database via Prisma's
 * $queryRaw.  Returns `true` when the table exists, `false` otherwise.
 */
export async function isTargetTableInDatabase(tableSchema: string, tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND LOWER(table_schema) = LOWER(${tableSchema})
      AND LOWER(table_name)   = LOWER(${tableName})
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Maps caller-friendly type aliases (e.g. 'VARCHAR', 'INTEGER') -> the ANSI
 * SQL name that `information_schema.columns.data_type` returns in PostgreSQL.
 *
 * Keys are stored in UPPER_CASE so lookups are case-insensitive (caller
 * should call `.toUpperCase()` before indexing).
 */
export const DATA_TYPE_TRANSLATIONS: Record<string, string> = {
  // String types
  'VARCHAR':          'character varying',
  'CHAR':             'character',
  'TEXT':             'text',
  'NVARCHAR':         'character varying',
  // Numeric types
  'INTEGER':          'integer',
  'INT':              'integer',
  'INT4':             'integer',
  'SMALLINT':         'smallint',
  'INT2':             'smallint',
  'BIGINT':           'bigint',
  'BIGINTEGER':       'bigint',
  'INT8':             'bigint',
  'DECIMAL':          'numeric',
  'NUMERIC':          'numeric',
  'REAL':             'real',
  'FLOAT':            'double precision',
  'FLOAT4':           'real',
  'FLOAT8':           'double precision',
  'DOUBLE PRECISION': 'double precision',
  // Boolean
  'BOOLEAN':          'boolean',
  'BOOL':             'boolean',
  // Date / time
  'DATE':             'date',
  'TIME':             'time without time zone',
  'TIMETZ':           'time with time zone',
  'TIMESTAMP':        'timestamp without time zone',
  'TIMESTAMPTZ':      'timestamp with time zone',
  'DATETIME':         'timestamp without time zone',
  // Binary / other
  'BYTEA':            'bytea',
  'UUID':             'uuid',
  'JSON':             'json',
  'JSONB':            'jsonb',
  'XML':              'xml',
};

/**
 * Reverse of DATA_TYPE_TRANSLATIONS: maps the `information_schema` data_type
 * value (lower-cased) -> the canonical friendly name used as the key in the
 * forward map (upper-cased).
 *
 * When multiple friendly names map to the same information_schema value (e.g.
 * INT, INT4, INTEGER all -> 'integer') we keep the last entry written; the
 * primary canonical name ('INTEGER') wins because it is declared last in the
 * map above.
 *
 * This is used to translate a template column's stored `type` (which comes
 * from information_schema via the PersistenceTable API) back to the canonical
 * friendly name so it can be looked up in the PersistenceDataType table.
 */
export const INFORMATION_SCHEMA_TO_FRIENDLY: Record<string, string> =
  Object.entries(DATA_TYPE_TRANSLATIONS).reduce<Record<string, string>>(
    (acc, [friendly, infoSchema]) => {
      acc[infoSchema.toLowerCase()] = friendly;
      return acc;
    },
    {},
  );

/**
 * Returns the `information_schema.columns.data_type` value that corresponds
 * to the given alias.  Falls back to the original value (lower-cased) when no
 * translation is found, so direct ANSI names still work.
 */
function translateDataType(alias: string): string {
  return DATA_TYPE_TRANSLATIONS[alias.toUpperCase()] ?? alias.toLowerCase();
}

/**
 * Checks whether a column with the given name exists in the specified table,
 * optionally validating its data type and nullability.
 *
 * Queries `information_schema.columns`.  Caller-facing type aliases (e.g.
 * 'VARCHAR', 'INTEGER') are translated to their ANSI SQL equivalents before
 * comparison so callers don't need to know PostgreSQL's internal naming.
 *
 * @param tableSchema    - Database schema (e.g. 'ds', 'public')
 * @param tableName      - Table to inspect
 * @param columnName     - Column that must exist
 * @param columnDataType - Optional type alias to validate (e.g. 'VARCHAR', 'INTEGER')
 * @param allowNull      - Optional nullability to validate (true -> nullable, false -> NOT NULL)
 *
 * Returns `true` when a matching column is found, `false` otherwise.
 */
export async function isColumnInTable(
  tableSchema: string,
  tableName: string,
  columnName: string,
  columnDataType?: string,
  allowNull?: boolean,
): Promise<boolean> {
  info(
    `[isColumnInTable] tableSchema='${tableSchema}' tableName='${tableName}' columnName='${columnName}' columnDataType=${columnDataType ?? '(none)'} allowNull=${allowNull ?? '(none)'}`
  );

  const translatedType =
    columnDataType !== undefined ? translateDataType(columnDataType) : undefined;

  info(`[isColumnInTable] translatedType=${translatedType ?? '(none)'}`);

  const dataTypeFilter =
    translatedType !== undefined
      ? Prisma.sql`AND LOWER(data_type) = LOWER(${translatedType})`
      : Prisma.empty;

  // is_nullable is a yes_or_no domain in information_schema (underlying TEXT).
  // Cast to text before comparing against the bind parameter.
  const nullableFilter =
    allowNull !== undefined
      ? Prisma.sql`AND is_nullable::text = ${allowNull ? 'YES' : 'NO'}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>(
    Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE LOWER(table_schema) = LOWER(${tableSchema})
        AND LOWER(table_name)   = LOWER(${tableName})
        AND LOWER(column_name)  = LOWER(${columnName})
        ${dataTypeFilter}
        ${nullableFilter}
      LIMIT 1
    `
  );
  info(`[isColumnInTable] result rows=${rows.length}, found=${rows.length > 0}`);
  return rows.length > 0;
}

/** Default strategy applied when none is provided by the caller. */
export const DEFAULT_DUPLICATES_HANDLING_STRATEGY: DuplicatesHandlingStrategy =
  DuplicatesHandlingStrategy.INSERT;

/** Returns true if the value is a valid DuplicatesHandlingStrategy. */
export function isValidDuplicatesHandlingStrategy(value: unknown): value is DuplicatesHandlingStrategy {
  return Object.values(DuplicatesHandlingStrategy).includes(value as DuplicatesHandlingStrategy);
}

// --- Record types (mirror Prisma model fields) --------------------------------

export interface PersistenceTemplateColumnRecord {
  id: number;
  templateId: number;
  index: number;
  name: string;
  type: string | null;
  length: number | null;
  allowNull: boolean;
  comment: string | null;
  csvColumnName: string | null;
  csvColumnIndex: number;
}

export interface PersistenceTemplateRecord {
  id: number;
  name: string;
  description: string | null;
  targetTable: string | null;
  enabled: boolean;
  hasCsvHeader: boolean;
  truncateBeforeImport: boolean;
  errorHandlingStrategy: ErrorHandlingStrategy;
  duplicatesHandlingStrategy: DuplicatesHandlingStrategy;
  createdBy: string;
  createdAt: Date;
  updatedBy: string | null;
  updatedAt: Date | null;
  columns: PersistenceTemplateColumnRecord[];
}

// --- Pagination ---------------------------------------------------------------

export interface PaginationOptions {
  /** 1-based page number (default: 1) */
  page: number;
  /** Items per page (default: 10, max: 100) */
  limit: number;
}


// --- Query functions ----------------------------------------------------------

/**
 * Returns a paginated slice of persistence templates with their columns.
 * Results are ordered by creation date descending.
 */
export async function getAllPersistenceTemplates(
  pagination: PaginationOptions
): Promise<PersistenceTemplateRecord[]> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const rows = await prisma.persistenceTemplate.findMany({
    include: { columns: { orderBy: { index: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });
  return rows as unknown as PersistenceTemplateRecord[];
}

/**
 * Returns a single persistence template by id, or null if not found.
 */
export async function getPersistenceTemplateById(
  id: number
): Promise<PersistenceTemplateRecord | null> {
  const row = await prisma.persistenceTemplate.findUnique({
    where: { id },
    include: { columns: { orderBy: { index: 'asc' } } },
  });
  return row as unknown as PersistenceTemplateRecord | null;
}

/**
 * Updates a persistence template's fields and fully replaces its columns.
 * Returns null if the template does not exist.
 */
export async function updatePersistenceTemplate(
  id: number,
  input: UpdatePersistenceTemplateInput
): Promise<PersistenceTemplateRecord | null> {
  // Check existence first to return null instead of throwing
  const exists = await prisma.persistenceTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return null;

  type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  const result = await prisma.$transaction(async (tx: TxClient) => {
    // Replace columns: delete all existing then recreate
    await tx.persistenceTemplateColumn.deleteMany({ where: { templateId: id } });

    return tx.persistenceTemplate.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? null,
        targetTable: input.targetTable ?? null,
        enabled: input.enabled ?? true,
        hasCsvHeader: input.hasCsvHeader ?? false,
        truncateBeforeImport: input.truncateBeforeImport ?? false,
        errorHandlingStrategy: input.errorHandlingStrategy ?? DEFAULT_ERROR_HANDLING_STRATEGY,
        duplicatesHandlingStrategy: input.duplicatesHandlingStrategy ?? DEFAULT_DUPLICATES_HANDLING_STRATEGY,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
        columns: {
          create: (input.columns ?? []).map((col) => ({
            index: col.index,
            name: col.name,
            type: col.type ?? null,
            length: col.length ?? null,
            allowNull: col.allowNull ?? true,
            comment: col.comment ?? null,
            csvColumnName: col.csvColumnName ?? null,
            csvColumnIndex: col.csvColumnIndex ?? -1,
          })),
        },
      },
      include: { columns: { orderBy: { index: 'asc' } } },
    });
  });
  return result as unknown as PersistenceTemplateRecord;
}

/** Thrown when a template name is already taken by another record. */
export class PersistenceTemplateNameConflictError extends Error {
  constructor(name: string) {
    super(`A Persistence Template with the name '${name}' already exists`);
    this.name = 'PersistenceTemplateNameConflictError';
  }
}

/**
 * Returns the id of an existing template whose name matches (case-insensitive),
 * optionally excluding one id (used during update to ignore self).
 */
export async function findPersistenceTemplateByName(
  name: string,
  excludeId?: number,
): Promise<number | null> {
  const row = await prisma.persistenceTemplate.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Thrown when a template cannot be deleted because it has associated jobs. */
export class PersistenceTemplateHasJobsError extends Error {
  constructor(name: string) {
    super(`The Persistence Template '${name}' cannot be deleted because it is currently associated with existing Persistence Jobs`);
    this.name = 'PersistenceTemplateHasJobsError';
  }
}

/**
 * Deletes a persistence template and its columns (cascade via Prisma relation).
 * Returns true when deleted, false when the template was not found.
 * @throws {PersistenceTemplateHasJobsError} when the template has associated jobs.
 */
export async function deletePersistenceTemplate(id: number): Promise<boolean> {
  const exists = await prisma.persistenceTemplate.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!exists) return false;

  type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  try {
    await prisma.$transaction(async (tx: TxClient) => {
      await tx.persistenceTemplateColumn.deleteMany({ where: { templateId: id } });
      await tx.persistenceTemplate.delete({ where: { id } });
    });
  } catch (err: unknown) {
    // Prisma error code P2003 = foreign key constraint violation
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2003'
    ) {
      throw new PersistenceTemplateHasJobsError(exists.name);
    }
    throw err;
  }

  return true;
}

/**
 * Creates a persistence template together with its columns (nested write).
 */
export async function createPersistenceTemplate(
  input: CreatePersistenceTemplateInput
): Promise<PersistenceTemplateRecord> {
  const row = await prisma.persistenceTemplate.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      targetTable: input.targetTable ?? null,
      enabled: input.enabled ?? true,
      hasCsvHeader: input.hasCsvHeader ?? false,
      truncateBeforeImport: input.truncateBeforeImport ?? false,
      errorHandlingStrategy: input.errorHandlingStrategy ?? DEFAULT_ERROR_HANDLING_STRATEGY,
      duplicatesHandlingStrategy: input.duplicatesHandlingStrategy ?? DEFAULT_DUPLICATES_HANDLING_STRATEGY,
      createdBy: input.createdBy,
      columns: {
        create: (input.columns ?? []).map((col) => ({
          index: col.index,
          name: col.name,
          type: col.type ?? null,
          length: col.length ?? null,
          allowNull: col.allowNull ?? true,
          comment: col.comment ?? null,
          csvColumnName: col.csvColumnName ?? null,
          csvColumnIndex: col.csvColumnIndex ?? -1,
        })),
      },
    },
    include: { columns: { orderBy: { index: 'asc' } } },
  });
  return row as unknown as PersistenceTemplateRecord;
}
