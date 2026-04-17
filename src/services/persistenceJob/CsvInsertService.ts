/**
 * CSV Insert Service
 *
 * Responsibility: take the validated CSV rows and insert them into the target
 * table defined by the PersistenceTemplate.
 *
 * Design:
 *   - Pure service - no direct DB access to the target table via Prisma models
 *     (the target schema/table is dynamic). Uses Prisma.$executeRawUnsafe for
 *     the actual INSERT statements.
 *   - The column order matches the template column order (sorted by index).
 *   - Respects the template's errorHandlingStrategy:
 *       STOP_ON_FIRST_ERROR_AND_ROLLBACK -> wraps all inserts in a transaction;
 *                                          aborts and rolls back on first error.
 *       STOP_ON_FIRST_ERROR_AND_COMMIT   -> inserts row by row; stops on the
 *                                          first error but commits all previously
 *                                          inserted rows.
 *       CONTINUE_ON_ERROR               -> inserts row by row; skips failures.
 *   - Respects the template's duplicatesHandlingStrategy:
 *       INSERT  -> plain INSERT (fails on duplicates - constraint violation is
 *                 handled by the errorHandlingStrategy)
 *       REPLACE -> INSERT ... ON CONFLICT DO UPDATE SET (upsert all non-PK cols)
 *
 * Open/Closed: the duplication/error strategies are handled via strategy helpers
 * - adding a new strategy only requires a new helper, no changes to the core loop.
 */

import { prisma } from '../../db/prisma';
import type { CsvValidationResult } from './CsvValidationService';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// --- Types --------------------------------------------------------------------

export interface InsertColumn {
  index:          number;
  name:           string;   // DB column name
  allowNull:      boolean;
  isPrimaryKey?:  boolean;  // true when this column is part of the PK
  csvColumnName:  string | null;
  csvColumnIndex: number;
}

export interface InsertOptions {
  /** Fully-qualified target table, e.g. "es.win_workforce_info" */
  targetTable:                string;
  /** Template columns (used to determine column names and order). */
  columns:                    InsertColumn[];
  /** Raw CSV buffer (header + data rows). */
  csvBuffer:                  Buffer;
  /** Whether the CSV file contains a header row. */
  hasCsvHeader:               boolean;
  /** Already-computed validation result (must be valid). */
  validationResult:           CsvValidationResult;
  errorHandlingStrategy:      string;
  duplicatesHandlingStrategy: string;
  /** User identifier for logging. */
  jobId:                      number;
  /**
   * Optional AbortSignal. When aborted, the for-loop breaks immediately
   * and the job is marked CANCELED.
   */
  signal?:                    AbortSignal;
  /**
   * Optional async callback injected by the service layer.
   * Returns true when the job's DB status has been set to CANCELED externally,
   * allowing the insert loop to self-cancel without an in-process signal.
   * Called every N rows (see poll-interval logic in insert()).
   */
  checkCancel?: () => Promise<boolean>;
}

export interface InsertResult {
  linesInserted: number;
  errorLine:     number;     // 0 = no error
  errorMessage:  string | null;
}

// --- Strategy constants -------------------------------------------------------

const STOP_ON_FIRST_ERROR_AND_ROLLBACK = 'STOP_ON_FIRST_ERROR_AND_ROLLBACK';
const STOP_ON_FIRST_ERROR_AND_COMMIT   = 'STOP_ON_FIRST_ERROR_AND_COMMIT';
const REPLACE                          = 'REPLACE';

// --- Debug helpers ------------------------------------------------------------

/** Pause for the given number of milliseconds (used for manual cancel testing). */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** How long to pause after each inserted row (60 s). Set to 0 to disable. */
const DEBUG_ROW_PAUSE_MS = 0;

// --- Service ------------------------------------------------------------------

export class CsvInsertService {

  /**
   * Inserts every data row from the CSV into the target table.
   *
   * Assumes the validation result is already valid - callers must not call
   * this with an invalid result.
   *
   * @returns InsertResult describing how many rows were inserted and any error.
   */
  async insert(options: InsertOptions): Promise<InsertResult> {
    const {
      targetTable,
      columns,
      csvBuffer,
      hasCsvHeader,
      errorHandlingStrategy,
      duplicatesHandlingStrategy,
      jobId,
    } = options;

    const prefix = `[CsvInsert][job=${jobId}]`;

    // Parse CSV lines
    const text     = csvBuffer.toString('utf-8');
    const allLines = text.split(/\r?\n/);

    // Resolve each column's CSV cell offset.
    // hasCsvHeader=true  -> match by csvColumnName against the header row.
    // hasCsvHeader=false -> use csvColumnIndex directly.
    const headerLine  = allLines[0] ?? '';
    const headerCells = this.splitCsvRow(headerLine);

    const headerPositionMap = hasCsvHeader
      ? new Map<string, number>(headerCells.map((h, i) => [h.trim().toLowerCase(), i]))
      : null;

    const orderedColumns = [...columns]
      .sort((a, b) => a.index - b.index)
      .map((col) => {
        let csvOffset: number;
        if (hasCsvHeader) {
          const pos = headerPositionMap!.get((col.csvColumnName ?? '').trim().toLowerCase());
          csvOffset = pos !== undefined ? pos : -1;
        } else {
          csvOffset = col.csvColumnIndex != null && col.csvColumnIndex !== -1
            ? col.csvColumnIndex
            : -1;
        }
        return { ...col, csvOffset };
      })
      .filter((col) => col.csvOffset !== -1);

    // Data rows: skip the header line when hasCsvHeader=true
    const dataRows = (hasCsvHeader ? allLines.slice(1) : allLines).filter((r) => r.trim().length > 0);

    const colNames = orderedColumns.map((c) => c.name);

    // Resolve PK columns once per job (only needed for REPLACE upsert)
    const pkCols = duplicatesHandlingStrategy === REPLACE
      ? await this.fetchPrimaryKeyColumns(targetTable, prefix)
      : [];

    const signal      = options.signal;
    const checkCancel = options.checkCancel;

    // Poll interval (how often to check DB cancellation status):
    //   < 10 rows  -> every 1 row
    //   < 100 rows -> every 10 rows
    //   < 5000 rows -> every 100 rows
    //   >= 5000 rows -> every 5% of total rows (min 1)
    const totalRows = dataRows.length;
    const pollEvery = totalRows < 10
      ? 1
      : totalRows < 100
        ? 10
        : totalRows < 5000
          ? 100
          : Math.max(1, Math.floor(totalRows * 0.05));

    console.log(`${prefix} Total rows: ${totalRows}, cancel-poll every ${pollEvery} row(s)`);

    const buildSql = (values: (string | null)[]): string =>
      this.buildInsertSql(targetTable, colNames, values, duplicatesHandlingStrategy, pkCols);

    type OrderedColumn = (typeof orderedColumns)[number];
    if (errorHandlingStrategy === STOP_ON_FIRST_ERROR_AND_ROLLBACK) {
      return this.insertWithTransaction(dataRows, orderedColumns as (InsertColumn & { csvOffset: number })[], buildSql, prefix, signal, checkCancel, pollEvery);
    }
    if (errorHandlingStrategy === STOP_ON_FIRST_ERROR_AND_COMMIT) {
      return this.insertStopAndCommit(dataRows, orderedColumns as (InsertColumn & { csvOffset: number })[], buildSql, prefix, signal, checkCancel, pollEvery);
    }
    console.warn(`${prefix} Error handling is default`);
    return this.insertContinueOnError(dataRows, orderedColumns as (InsertColumn & { csvOffset: number })[], buildSql, prefix, signal, checkCancel, pollEvery);
  }

  // --- Transaction strategy (abort + rollback on first error) -----------------

  private async insertWithTransaction(
    dataRows:       string[],
    columns:        (InsertColumn & { csvOffset: number })[],
    buildSql:       (values: (string | null)[]) => string,
    prefix:         string,
    signal?:        AbortSignal,
    checkCancel?:   () => Promise<boolean>,
    pollEvery?:     number,
  ): Promise<InsertResult> {
    let linesInserted = 0;

    try {
      await prisma.$transaction(async (tx: TxClient) => {
        for (let i = 0; i < dataRows.length; i++) {
          if (signal?.aborted) { console.warn(`${prefix} [ABORT] Signal fired at row ${i + 1} - rolling back transaction`); throw new Error('Job canceled - transaction rolled back'); }
          if (checkCancel && pollEvery && i > 0 && i % pollEvery === 0) {
            const canceled = await checkCancel();
            if (canceled) { console.warn(`${prefix} [CANCEL] DB status is CANCELED at row ${i + 1} - rolling back transaction`); throw new Error('Job canceled - transaction rolled back'); }
          }
          const cells  = this.splitCsvRow(dataRows[i]!);
          const values = columns.map((col) => {
            const raw = (cells[col.csvOffset] ?? '').trim();
            return raw === '' ? null : raw;
          });

          const sql = buildSql(values);
          // console.log(`${prefix} Row ${i + 1}: ${sql.slice(0, 120)}...`);

          await tx.$executeRawUnsafe(sql);
          linesInserted++;
          if (DEBUG_ROW_PAUSE_MS > 0) { console.log(`${prefix} [DEBUG] Pausing ${DEBUG_ROW_PAUSE_MS / 1000}s after row ${i + 1} - cancel now to test abort`); await sleep(DEBUG_ROW_PAUSE_MS); }
        }
      },
      {
        timeout: 300 * 1000, // 300 seconds
        maxWait: 5000,       // How long to wait for a connection from the pool
      });

      console.log(`${prefix} Inserted ${linesInserted} row(s) successfully`);
      return { linesInserted, errorLine: 0, errorMessage: null };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} Transaction failed after ${linesInserted} row(s): ${msg}`);
      return { linesInserted: 0, errorLine: linesInserted + 1, errorMessage: msg };
    }
  }

  // --- Stop-and-commit strategy (stop on first error, commit prior rows) --------

  private async insertStopAndCommit(
    dataRows:     string[],
    columns:      (InsertColumn & { csvOffset: number })[],
    buildSql:     (values: (string | null)[]) => string,
    prefix:       string,
    signal?:      AbortSignal,
    checkCancel?: () => Promise<boolean>,
    pollEvery?:   number,
  ): Promise<InsertResult> {
    let linesInserted = 0;

    for (let i = 0; i < dataRows.length; i++) {
      if (signal?.aborted) { console.warn(`${prefix} [ABORT] Signal fired at row ${i + 1} - breaking stop-and-commit loop`); break; }
      if (checkCancel && pollEvery && i > 0 && i % pollEvery === 0) {
        const canceled = await checkCancel();
        if (canceled) { console.warn(`${prefix} [CANCEL] DB status is CANCELED at row ${i + 1} - breaking stop-and-commit loop`); break; }
      }
      const rowNumber = i + 1;
      const cells     = this.splitCsvRow(dataRows[i]!);
      const values    = columns.map((col) => {
        const raw = (cells[col.csvOffset] ?? '').trim();
        return raw === '' ? null : raw;
      });

      const sql = buildSql(values);
      // console.log(`${prefix} Row ${rowNumber}: ${sql}`);

      try {
        await prisma.$executeRawUnsafe(sql);
        linesInserted++;
        if (DEBUG_ROW_PAUSE_MS > 0) { console.log(`${prefix} [DEBUG] Pausing ${DEBUG_ROW_PAUSE_MS / 1000}s after row ${rowNumber} - cancel now to test abort`); await sleep(DEBUG_ROW_PAUSE_MS); }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${prefix}   Row ${rowNumber} FAILED (stop-and-commit): ${msg}`);
        console.log(`${prefix} Committed ${linesInserted} row(s) before error on row ${rowNumber}`);
        return { linesInserted, errorLine: rowNumber, errorMessage: msg };
      }
    }

    console.log(`${prefix} Inserted ${linesInserted} row(s) successfully`);
    return { linesInserted, errorLine: 0, errorMessage: null };
  }

  // --- Continue-on-error strategy (skip failed rows) ---------------------------

  private async insertContinueOnError(
    dataRows:     string[],
    columns:      (InsertColumn & { csvOffset: number })[],
    buildSql:     (values: (string | null)[]) => string,
    prefix:       string,
    signal?:      AbortSignal,
    checkCancel?: () => Promise<boolean>,
    pollEvery?:   number,
  ): Promise<InsertResult> {
    let linesInserted = 0;
    let errorLine     = 0;
    let errorMessage: string | null = null;

    for (let i = 0; i < dataRows.length; i++) {
      if (signal?.aborted) { console.warn(`${prefix} [ABORT] Signal fired at row ${i + 1} - breaking continue-on-error loop`); break; }
      if (checkCancel && pollEvery && i > 0 && i % pollEvery === 0) {
        const canceled = await checkCancel();
        if (canceled) { console.warn(`${prefix} [CANCEL] DB status is CANCELED at row ${i + 1} - breaking continue-on-error loop`); break; }
      }
      const rowNumber = i + 1;
      const cells     = this.splitCsvRow(dataRows[i]!);
      const values    = columns.map((col) => {
        const raw = (cells[col.csvOffset] ?? '').trim();
        return raw === '' ? null : raw;
      });

      const sql = buildSql(values);
      // console.log(`${prefix} Row ${rowNumber}: ${sql}`);

      try {
        await prisma.$executeRawUnsafe(sql);
        linesInserted++;
        if (DEBUG_ROW_PAUSE_MS > 0) { console.log(`${prefix} [DEBUG] Pausing ${DEBUG_ROW_PAUSE_MS / 1000}s after row ${rowNumber} - cancel now to test abort`); await sleep(DEBUG_ROW_PAUSE_MS); }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${prefix}   Row ${rowNumber} FAILED: ${msg}`);
        if (errorLine === 0) {
          errorLine    = rowNumber;
          errorMessage = msg;
        }
      }
    }

    console.log(`${prefix} Done - inserted ${linesInserted}/${dataRows.length} row(s)`);
    return { linesInserted, errorLine, errorMessage };
  }

  // --- PK lookup (used by REPLACE upsert to resolve the conflict target) --------

  private async fetchPrimaryKeyColumns(
    targetTable: string,
    prefix:      string,
  ): Promise<string[]> {
    // targetTable is "schema.table" or just "table"
    const parts      = targetTable.split('.');
    const tableSchema = parts.length === 2 ? parts[0]! : 'public';
    const tableName   = parts.length === 2 ? parts[1]! : parts[0]!;

    interface PkRow { column_name: string }
    const rows: PkRow[] = await prisma.$queryRawUnsafe(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
       AND tc.table_name      = kcu.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema    = '${tableSchema}'
        AND tc.table_name      = '${tableName}'
      ORDER BY kcu.ordinal_position
    `);

    const pkCols = rows.map((r: PkRow) => r.column_name);
    console.log(`${prefix} PK columns for ${targetTable}: [${pkCols.join(', ')}]`);
    return pkCols;
  }

  // --- SQL builder -------------------------------------------------------------

  private buildInsertSql(
    table:       string,
    colNames:    string[],
    values:      (string | null)[],
    dupStrategy: string,
    pkCols:      string[],
  ): string {
    const cols = colNames.map((c) => `"${c}"`).join(', ');
    const vals = values.map((v) => v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`).join(', ');
    const base = `INSERT INTO ${table} (${cols}) VALUES (${vals})`;

    if (dupStrategy === REPLACE) {
      if (pkCols.length === 0) {
        // No PK found - fall back to plain INSERT so it fails visibly
        console.warn(`buildInsertSql: REPLACE requested but no PK found for ${table} - using plain INSERT`);
        return base;
      }
      // Upsert: ON CONFLICT (pk_col, ...) DO UPDATE SET non-pk-cols
      const conflictTarget = pkCols.map((c) => `"${c}"`).join(', ');
      const updateCols     = colNames.filter((c) => !pkCols.includes(c));
      const updates        = updateCols.length > 0
        ? updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
        : `"${colNames[0]}" = EXCLUDED."${colNames[0]}"`; // safety fallback
      return `${base} ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}`;
    }

    // Default (INSERT): plain INSERT - fails on constraint violation so the
    // errorHandlingStrategy decides what happens next.
    return base;
  }

  // --- CSV row parser (same as CsvValidationService - handles quoted fields) ---

  private splitCsvRow(row: string): string[] {
    const cells: string[] = [];
    let current  = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const ch   = row[i]!;
      const next = row[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') { current += '"'; i++; }
        else if (ch === '"')            { inQuotes = false; }
        else                            { current += ch; }
      } else {
        if      (ch === '"') { inQuotes = true; }
        else if (ch === ',') { cells.push(current); current = ''; }
        else                 { current += ch; }
      }
    }

    cells.push(current);
    return cells;
  }
}

/** Singleton instance. */
export const csvInsertService = new CsvInsertService();
