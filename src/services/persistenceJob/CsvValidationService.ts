/**
 * CSV Validation Service
 *
 * Responsibility: validate the content of an uploaded CSV file against the
 * column definitions of a PersistenceTemplate using data-type rules fetched
 * from the database (via GET /api/persistence-data-type).
 *
 * Validation rules per column (driven by PersistenceTemplateColumn fields):
 *   - allowNull        -> if false, the cell value must not be empty
 *   - length           -> if set, the string length of the cell must not exceed it
 *   - type             -> matched case-insensitively against PersistenceDataType.name;
 *                        if a matching data type has a regularExpression, that
 *                        regex is used to validate the cell value.
 *
 * Design:
 *   - The service is pure (no direct DB access) - data types are injected by
 *     the caller (Dependency Inversion Principle).
 *   - Adding a new data type only requires a DB insert; no code change needed
 *     (Open/Closed Principle).
 */

// --- Types --------------------------------------------------------------------

/** Minimal shape of a PersistenceDataType record needed for validation. */
export interface DataType {
  name:              string;
  regularExpression: string | null;
}

export interface TemplateColumn {
  index:          number;
  name:           string;
  type:           string | null;
  length:         number | null;
  allowNull:      boolean;
  csvColumnName:  string | null;
  csvColumnIndex: number;
}

export interface CellError {
  row:     number;   // 1-based data row (header = row 0)
  column:  string;   // column name from the template
  value:   string;   // raw cell value
  message: string;
}

export interface CsvValidationResult {
  valid:        boolean;
  headerErrors: string[];      // issues with the header row itself
  cellErrors:   CellError[];   // issues with individual data cells
  rowsChecked:  number;
}

// --- Service ------------------------------------------------------------------

export class CsvValidationService {

  /**
   * Validates a CSV buffer against the given template columns.
   *
   * The first row of the CSV is treated as the header.
   * Column matching is done by position (sorted by `index`, then mapped to
   * sequential 0-based offsets) so the CSV cell at offset N is always
   * validated against the Nth template column.
   *
   * Type validation uses the `regularExpression` of the matching DataType
   * record (matched by name, case-insensitive). If no regex is stored the
   * type check is skipped (any value is accepted for that type).
   *
   * @param csvBuffer        - Raw bytes of the uploaded CSV file.
   * @param templateColumns  - Ordered array of template column definitions.
   * @param dataTypes        - All data types fetched from the DB.
   * @param jobId            - Job id used for log prefixing.
   * @param stopOnFirstError - When true, validation stops as soon as the first
   *                           cell error is found (default: false — collect all errors).
   * @returns CsvValidationResult
   */
  validate(
    csvBuffer:        Buffer,
    templateColumns:  TemplateColumn[],
    dataTypes:        DataType[],
    jobId:            number,
    stopOnFirstError: boolean = false,
    hasCsvHeader:     boolean = true,
  ): CsvValidationResult {
    const prefix  = `[CsvValidation][job=${jobId}]`;
    const text    = csvBuffer.toString('utf-8');
    const rawRows = text.split(/\r?\n/);

    // Build a lookup map: lowercase type name -> compiled RegExp (or null)
    const dataTypeMap = new Map<string, RegExp | null>();
    for (const dt of dataTypes) {
      const re = dt.regularExpression ? new RegExp(dt.regularExpression) : null;
      dataTypeMap.set(dt.name.toLowerCase(), re);
    }

    const headerErrors: string[] = [];
    const cellErrors:   CellError[] = [];
    // Tracks which column names have already triggered an "unknown type" warning
    const warnedColumns = new Set<string>();

    // -- Header row (always the first raw line) --------------------------------
    const headerRow   = rawRows[0] ?? '';
    const headerCells = this.splitCsvRow(headerRow);

    console.log(`${prefix} hasCsvHeader=${hasCsvHeader} Header: [${headerCells.join(' | ')}]`);

    // Resolve each template column's 0-based CSV cell offset.
    // hasCsvHeader=true  -> match by csvColumnName against the header row.
    // hasCsvHeader=false -> use csvColumnIndex directly (0-based positional).
    let columns: (TemplateColumn & { csvOffset: number })[];

    if (hasCsvHeader) {
      // Build a map: lowercase header text -> position
      const headerPositionMap = new Map<string, number>(
        headerCells.map((h, i) => [h.trim().toLowerCase(), i]),
      );
      columns = templateColumns
        .filter((col) => col.csvColumnName && col.csvColumnName.trim() !== '')
        .map((col) => {
          const pos = headerPositionMap.get(col.csvColumnName!.trim().toLowerCase());
          if (pos === undefined) {
            headerErrors.push(`Template column "${col.name}": CSV header "${col.csvColumnName}" not found in file`);
          }
          return { ...col, csvOffset: pos ?? -1 };
        })
        .filter((col) => col.csvOffset !== -1);
    } else {
      // hasCsvHeader=false: no header line consumed - all lines are data rows.
      // Use csvColumnIndex as the direct cell offset.
      columns = templateColumns
        .filter((col) => col.csvColumnIndex != null && col.csvColumnIndex !== -1)
        .map((col) => ({ ...col, csvOffset: col.csvColumnIndex }));
    }

    // -- Data rows -------------------------------------------------------------
    // When hasCsvHeader=true the first line is the header; skip it.
    // When hasCsvHeader=false every line is a data row.
    const dataRows = (hasCsvHeader ? rawRows.slice(1) : rawRows).filter((r) => r.trim().length > 0);
    let rowsChecked = 0;

    console.log(`${prefix} Total of rows: ${dataRows.length}`);

    outer:
    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const dataRow   = dataRows[rowIdx]!;
      const cells     = this.splitCsvRow(dataRow);
      const rowNumber = rowIdx + 1; // 1-based

      // console.log(`${prefix} Row ${rowNumber}: [${cells.join(' | ')}]`);

      for (const col of columns) {
        if (col.csvOffset < 0 || col.csvOffset >= cells.length) continue;
        const cellValue = (cells[col.csvOffset] ?? '').trim();

        // -- allowNull check -------------------------------------------------
        if (!col.allowNull && cellValue === '') {
          cellErrors.push({
            row:     rowNumber,
            column:  col.name,
            value:   cellValue,
            message: `Column "${col.name}" does not allow null/empty values`,
          });
          if (stopOnFirstError) { rowsChecked++; break outer; }
          continue; // skip further checks for this cell
        }

        // Skip remaining checks for empty optional cells
        if (cellValue === '') continue;

        // -- length check ----------------------------------------------------
        if (col.length !== null && cellValue.length > col.length) {
          cellErrors.push({
            row:     rowNumber,
            column:  col.name,
            value:   cellValue,
            message: `Column "${col.name}" exceeds max length ${col.length} (got ${cellValue.length})`,
          });
          if (stopOnFirstError) { rowsChecked++; break outer; }
        }

        // -- type check (driven by DB regularExpression) ---------------------
        if (col.type) {
          // col.type is stored as the information_schema data_type value
          // (e.g. "character varying", "boolean").
          // The dataTypeMap is keyed by PersistenceDataType.name (lower-cased),
          // which the DB team will align to use the same information_schema
          // values. No translation needed here.
          const typeKey = col.type.toLowerCase();

          if (dataTypeMap.has(typeKey)) {
            const re = dataTypeMap.get(typeKey)!;
            if (re !== null && !re.test(cellValue)) {
              cellErrors.push({
                row:     rowNumber,
                column:  col.name,
                value:   cellValue,
                message: `Column "${col.name}" (type "${col.type}"): value "${cellValue}" does not match expected format`,
              });
              if (stopOnFirstError) { rowsChecked++; break outer; }
            }
          } else {
            // Type is not registered in the DB - log a warning once per column
            if (!warnedColumns.has(col.name)) {
              warnedColumns.add(col.name);
              console.log(`${prefix}   WARN: unknown type "${col.type}" for column "${col.name}" - skipping type check`);
            }
          }
        }
      }

      rowsChecked++;
    }

    const valid = headerErrors.length === 0 && cellErrors.length === 0;

    if (valid) {
      console.log(`${prefix} Validation PASSED - ${rowsChecked} row(s) checked`);
    } else {
      console.log(
        `${prefix} Validation FAILED - ${headerErrors.length} header error(s), ` +
        `${cellErrors.length} cell error(s) across ${rowsChecked} row(s)`,
      );
      headerErrors.forEach((e) => console.log(`${prefix}   HEADER: ${e}`));
      cellErrors.forEach((e) =>
        console.log(`${prefix}   Row ${e.row} / "${e.column}": ${e.message}`),
      );
    }

    return { valid, headerErrors, cellErrors, rowsChecked };
  }

  // --- CSV row parser (handles RFC-4180 quoted fields) -------------------------

  private splitCsvRow(row: string): string[] {
    const cells: string[] = [];
    let current  = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const ch   = row[i]!;
      const next = row[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          cells.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }

    cells.push(current);
    return cells;
  }
}

/** Singleton instance. */
export const csvValidationService = new CsvValidationService();
