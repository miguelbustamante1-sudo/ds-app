# Technical Documentation: Data Import System

**Domain:** Data Import (`di` schema)  
**Feature area:** Template Builder + Persistence Jobs  
**Frontend pages:** `/template-builder`, `/data-import`  
**Backend routes:** `/api/persistence-template`, `/api/persistence-job`  
**Services:** `src/services/persistenceTemplate/`, `src/services/persistenceJob/`

---

## Glossary

Terms used throughout this document with their precise meaning in this system.

**Persistence Template**  
A saved configuration record that describes how a CSV file maps to a database table. It defines the target table, the column mapping, the separator character, and both the error and duplicate strategies. It is reusable — the same template can be used for many import jobs over time. Stored in `di.pte_persistence_templates`.

**Persistence Template Column**  
A child record of a Persistence Template that describes the mapping for one DB column: its name in the target table, the expected data type, whether it accepts null, and which CSV column it reads from (by header name or by index). Stored in `di.ptc_persistence_template_columns`.

**Persistence Job**  
A single execution of a Persistence Template against a specific uploaded file. It is the runtime record: it tracks status, how many rows were processed, whether an error occurred, and on which row. One template can produce many jobs over time. Stored in `di.pjo_persistence_jobs`.

**Persistence Data Type**  
A DB-registered type definition used during CSV validation. Each record has a name (e.g. `"character varying"`), an optional regular expression, and an optional example value. If a template column declares a type that has a data type record with a regex, every cell in that column is validated against that regex before the import runs. Stored in `di.pdt_persistence_data_types`.

**Target Table**  
The fully-qualified PostgreSQL table (`schema.table`) that a Persistence Template writes into. It is stored as a string on the template (`pte_target_table`). The target table can live in any schema accessible to the application (typically `ds` or `es`). It is validated to exist at template save time via `information_schema`.

**Column Mapping**  
The association between one template column and one column in the uploaded CSV file. When `hasCsvHeader = true` the mapping is by column name (`ptc_csv_column_name`). When `hasCsvHeader = false` the mapping is by zero-based position (`ptc_csv_column_index`). A column with no mapping (`-1` or empty) is called unmapped and is excluded from all generated SQL.

**Unmapped Column**  
A template column that has `ptc_csv_column_index = -1` or `ptc_csv_column_name = null/empty`. It is part of the template definition but is not read from the CSV. It does not appear in the `INSERT` column list. Its value in the target table is determined entirely by the DB column's default — or causes a NOT NULL constraint violation if no default exists.

**Upsert**  
An `INSERT ... ON CONFLICT (...) DO UPDATE SET ...` statement. When a row in the CSV has a primary key that already exists in the target table, instead of failing with a duplicate key error, the existing row is updated with the values from the CSV. When the key does not exist, a plain insert is performed. The upsert behaviour is activated by setting `duplicatesHandlingStrategy = REPLACE` on the template.

**Fire and Forget**  
The pattern used by the job creation endpoint. When `POST /api/persistence-job` is called, the server creates the job record and immediately returns an HTTP response to the client with the new job's `id`. The actual CSV processing (validation + insert) is then started asynchronously using `setImmediate()` and runs independently of the HTTP connection. The client is expected to poll `GET /api/persistence-job/:id` to track progress. This prevents large file imports from holding the HTTP connection open.

**`setImmediate`**  
A Node.js API that schedules a callback to run on the next iteration of the event loop, after all I/O events already queued have been processed. In this system it is used to defer the validate→insert pipeline so the job creation HTTP response can be sent to the client first. It is not a background worker or a separate thread — it runs in the same Node.js process.

**Batch**  
A group of up to 500 CSV data rows that are combined into a single multi-row `INSERT` SQL statement. Batching reduces the number of round-trips to the database. If a batch fails, the service retries the same batch row by row to identify the exact failing row number.

**Error Handling Strategy**  
A template-level setting that controls what happens when a row cannot be inserted. `STOP_ON_FIRST_ERROR_AND_ROLLBACK` wraps all inserts in a single database transaction and rolls back everything on the first error. `STOP_ON_FIRST_ERROR_AND_COMMIT` stops processing on the first error but commits all rows that succeeded before it. `CONTINUE_ON_ERROR` skips failing rows and continues to the end of the file.

**Duplicate Handling Strategy**  
A template-level setting that controls what happens when an inserted row conflicts with an existing primary key. `INSERT` uses a plain `INSERT` statement — a duplicate key raises a constraint violation, which is then handled by the error strategy. `REPLACE` uses `INSERT ... ON CONFLICT DO UPDATE SET` (upsert) — duplicates are updated rather than rejected.

**Truncate Before Import**  
An optional template flag (`pte_truncate_before_import`). When enabled, the target table is cleared with `TRUNCATE TABLE` before any rows are inserted. This runs outside any transaction: if the import subsequently fails, the truncation is not reversed. Templates with this flag set are designed for full-replace loads where prior data is always discarded.

**DB-driven Cancellation**  
The mechanism by which a running job stops itself. There is no in-process kill signal. Instead, `POST /api/persistence-job/cancel/:id` sets the job's status to `CANCELED` in the database. The insert loop periodically calls `isJobCanceled(jobId)` (a lightweight `SELECT` on the job row) and breaks out of the loop when it detects the `CANCELED` status. The poll frequency is adaptive: more frequent for small files, less frequent for large ones.

**`information_schema`**  
A standard PostgreSQL (and ANSI SQL) read-only schema that exposes metadata about the database's own structure: tables, columns, data types, constraints, primary keys, etc. This system queries `information_schema.tables` to validate that a target table exists, `information_schema.columns` to validate that template columns exist and match the declared type and nullability, and `information_schema.key_column_usage` to discover which columns form the primary key when building upsert SQL.

**`$executeRawUnsafe`**  
A Prisma client method that sends a raw SQL string directly to the database without any parameterisation or escaping performed by Prisma. Used here because the target table and column names are dynamic (not known at compile time and therefore not expressible as typed Prisma model operations). Values in the SQL are escaped manually with single-quote doubling (`'` → `''`).

**`$queryRawUnsafe`**  
A Prisma client method similar to `$executeRawUnsafe` but used for `SELECT` statements that return rows. Used in this system to query `information_schema` for primary key discovery.

**Schema (`di`, `ds`, `es`)**  
PostgreSQL schema namespaces. `di` (Data Import) holds all system metadata tables for this feature. `ds` (Data Store) holds the main application domain tables. `es` (External Store) holds transient or external data tables — typically created and dropped dynamically. Persistence Templates can target tables in any of these schemas.

**Conflict Guard**  
The check performed at job creation time by `hasActiveJobForTable`. It queries `pjo_persistence_jobs` for any row with status `WAITING` or `RUNNING` whose template points to the same `targetTable`. If found, the new job is rejected with HTTP 409. This prevents two concurrent import jobs from writing to the same table simultaneously, which could cause unpredictable data interleaving or deadlocks.

---

## 1. Purpose and Design Intent

The Data Import System solves a recurring operational problem: data that lives in external tools (Workday, spreadsheets, other HR/ops platforms) needs to be loaded into specific tables in the `ds` or `es` schemas without requiring a developer to write a one-off migration script each time.

The system externalises the mapping concern. A technical user defines *once* how columns in a CSV relate to columns in a target DB table — that definition is a **Persistence Template**. Once defined, any user with import permissions can upload a file against that template repeatedly. The template controls:

- Which DB table receives the data
- Which CSV columns map to which DB columns
- What to do on duplicate primary keys
- What to do when a row fails validation

The actual SQL is never written by the user. The backend generates and executes it.

---

## 2. Database Schema

All tables live in the `di` PostgreSQL schema.

### 2.1 Entity Relationship Diagram

```
di.pdt_persistence_data_types
  pdt_id          PK
  pdt_index       UNIQUE
  pdt_name                       ─── referenced by pte column type (soft ref, no FK)
  pdt_regular_expression
  pdt_example

di.pte_persistence_templates
  pte_id          PK
  pte_name        UNIQUE (case-insensitive, enforced in code)
  pte_description
  pte_enabled
  pte_has_csv_header
  pte_separator
  pte_truncate_before_import
  pte_error_handling_strategy    ENUM: STOP_ON_FIRST_ERROR_AND_ROLLBACK | STOP_ON_FIRST_ERROR_AND_COMMIT
  pte_duplicates_handling_strategy ENUM: INSERT | REPLACE
  pte_target_table               "schema.table" — points to a table in the DS/ES DB
  pte_created_by, pte_created_at, pte_updated_by, pte_updated_at

di.ptc_persistence_template_columns
  ptc_id          PK
  pte_id          FK → pte_persistence_templates.pte_id  (CASCADE DELETE)
  ptc_index       display/sort order
  ptc_name        DB column name in the target table
  ptc_type        data_type from information_schema (e.g. "character varying", "integer")
  ptc_length      max character length (nullable)
  ptc_allow_null  whether empty cells are accepted
  ptc_comment
  ptc_csv_column_name   header name in the CSV (used when pte_has_csv_header = true)
  ptc_csv_column_index  0-based position in the CSV (used when pte_has_csv_header = false); -1 = unmapped

di.pjo_persistence_jobs
  pjo_id              PK
  pjo_status          ENUM: NEW | WAITING | RUNNING | SUCCESSFUL | FAILED | CANCELED
  pjo_file_input_name
  pjo_file_storage_path
  pjo_file_lines_count       total data rows in the uploaded file
  pjo_file_lines_inserted    rows successfully written to the target table
  pjo_file_error_line        1-based row number where the first error occurred (0 = no error)
  pjo_file_error_message
  pte_id              FK → pte_persistence_templates.pte_id  (RESTRICT DELETE)
  pjo_created_by, pjo_created_at, pjo_updated_by, pjo_updated_at
```

### 2.2 Key Relationship Rules

- `ptc_persistence_template_columns` is `CASCADE DELETE` from `pte_persistence_templates`: deleting a template wipes all its column definitions atomically.
- `pjo_persistence_jobs` is `RESTRICT` from `pte_persistence_templates`: a template that has associated jobs cannot be deleted. This prevents orphaned job records that reference a deleted template's configuration.
- `pdt_persistence_data_types` has no FK into either template table. The `ptc_type` field stores a string that is matched at runtime by name. This is intentional: data types can be added to the DB without touching any template definition.
- A unique index on `pjo_status` supports the active-job conflict check (`hasActiveJobForTable`) efficiently.

### 2.3 Column Mapping Modes

The `ptc_persistence_template_columns` table supports two mutually exclusive column-matching strategies controlled by `pte_has_csv_header`:

| `hasCsvHeader` | Matching field | Value | Meaning |
|---|---|---|---|
| `true` | `ptc_csv_column_name` | `"win_wdid"` | Match by CSV header text |
| `false` | `ptc_csv_column_index` | `2` | Match by zero-based column position |
| either | either | `-1` / `null` | Column is defined in template but not mapped to any CSV column |

Unmapped columns (index = -1, name = null/empty) are excluded from the generated `INSERT` column list entirely. They receive whatever the DB column's default is — or cause a NOT NULL violation if no default exists.

---

## 3. Architecture

### 3.1 Layer Map

```
Browser
  └── /template-builder         (template-builder/form.tsx)
  └── /data-import/new          (data-import/new.tsx)
  └── /data-import/:id          (data-import/detail.tsx)
         │
         │  multipart/form-data  (POST /api/persistence-job)
         │  JSON                 (REST CRUD /api/persistence-template)
         ▼
Express Routes (thin controllers)
  ├── persistenceTemplate.routes.ts   — CRUD for templates
  └── persistenceJob.routes.ts        — create, get, cancel jobs
         │
         ▼
Service Layer
  ├── PersistenceTemplateService      — template business rules (name uniqueness, column validation)
  └── PersistenceJobService           — job orchestration (conflict guard, validate→insert pipeline)
         │
         ▼
Components
  ├── CsvValidationService            — pure; validates CSV content against template column rules
  └── CsvInsertService                — executes SQL; implements error and duplicate strategies
         │
         ▼
Repository Layer
  ├── persistenceTemplate/repository  — Prisma reads/writes for templates and columns
  └── persistenceJob/repository       — Prisma reads/writes for jobs; $queryRawUnsafe for inserts
         │
         ▼
PostgreSQL
  ├── di schema                       — system metadata tables (above)
  └── es / ds schema                  — target tables that receive the imported data
```

### 3.2 File Layout

```
src/
  routes/
    persistenceTemplate.routes.ts
    persistenceJob.routes.ts
  services/
    persistenceTemplate/
      PersistenceTemplateService.ts   — orchestrator
      repository.ts                   — data access + isTargetTableInDatabase + isColumnInTable
    persistenceJob/
      PersistenceJobService.ts        — job lifecycle orchestrator
      CsvValidationService.ts         — pure validation (no DB writes)
      CsvInsertService.ts             — SQL generation and execution
      repository.ts                   — job data access
      decodeCsvBuffer.ts              — buffer → UTF-8 string
  services/
    persistenceDataType/
      PersistenceDataTypeService.ts   — read-only access to pdt_persistence_data_types

client/src/
  pages/
    template-builder/
      index.tsx                       — list page (DataGrid)
      form.tsx                        — create/edit dialog
    data-import/
      index.tsx                       — job list
      new.tsx                         — file upload + preview
      detail.tsx                      — job status detail
  services/
    persistenceTemplate.ts            — API client functions
    persistenceJob.ts                 — API client functions
  config/
    persistenceStrategyDescriptions.ts — human-readable labels for strategies
```

---

## 4. Template Builder

### 4.1 What It Does

Provides a CRUD interface for `pte_persistence_templates` and their child `ptc_persistence_template_columns`. Each template is a reusable definition: "this CSV structure goes into this table, with these rules."

### 4.2 Column Validation at Save Time

When a template is saved (POST or PUT), the backend validates every column entry against PostgreSQL's `information_schema.columns`:

```sql
SELECT column_name
FROM information_schema.columns
WHERE LOWER(table_schema) = LOWER(:schema)
  AND LOWER(table_name)   = LOWER(:table)
  AND LOWER(column_name)  = LOWER(:columnName)
  [AND LOWER(data_type) = LOWER(:dataType)]
  [AND is_nullable::text = 'YES' | 'NO']
LIMIT 1
```

If any column in the submitted payload does not exist in the target table with the specified type and nullability, the entire save is rejected with HTTP 400. This ensures the template always describes real columns.

The `isTargetTableInDatabase` function runs a similar check for the table itself before column validation begins.

### 4.3 Data Type Translation

The `ptc_type` field stores the `information_schema` `data_type` value (e.g. `"character varying"`, `"integer"`). The repository maintains `DATA_TYPE_TRANSLATIONS`, a map of friendly aliases (`"VARCHAR"`, `"INT"`) to their `information_schema` equivalents. This map is used bidirectionally:

- **Forward** (`DATA_TYPE_TRANSLATIONS`): translates the user-submitted type alias to the ANSI name before querying `information_schema`.
- **Reverse** (`INFORMATION_SCHEMA_TO_FRIENDLY`): translates the stored `information_schema` type back to a friendly alias when presenting it to the user.

### 4.4 Column Uniqueness Rule

The route layer (`validateCsvColumnUniqueness`) enforces that no two template columns can share the same CSV mapping target:

- When `hasCsvHeader = true`: no two columns may have the same `csvColumnName` (ignoring empty/null values).
- When `hasCsvHeader = false`: no two columns may have the same `csvColumnIndex` (ignoring -1).

This is enforced before persistence, not at the DB level, because the uniqueness constraint is conditional on `hasCsvHeader`.

### 4.5 Update Behaviour (Full Replace)

A PUT replaces the column list atomically. The repository uses a transaction:

1. `DELETE FROM ptc_persistence_template_columns WHERE pte_id = :id`
2. `UPDATE pte_persistence_templates SET ... WHERE pte_id = :id`
3. Nested `CREATE` for all submitted columns

This avoids partial updates where some old columns remain and some new ones are added.

### 4.6 Delete Guard

A template can only be deleted if it has no associated `pjo_persistence_jobs` rows. The repository catches Prisma error code `P2003` (FK constraint violation from `RESTRICT`) and throws `PersistenceTemplateHasJobsError`, which the route turns into HTTP 409.

---

## 5. Data Import (Persistence Jobs)

### 5.1 Frontend Validation (Pre-Submit)

Before the user can click "Start Import", the frontend runs a format-only validation pass against the first 25 CSV rows. This is purely cosmetic/preventive — it does not block the backend from running its own full validation.

Validation per column:
- Resolves the column's CSV offset (by header name or index depending on `hasCsvHeader`).
- If the column has a `type` and that type has a `regularExpression` in `pdt_persistence_data_types`, each cell is tested against `new RegExp(^${re}$)`.
- Empty cells for columns marked `allowNull = true` are skipped.
- The submit button is disabled while any cell-level error exists.

Missing columns (CSV has fewer columns than the template expects) are highlighted in red in the preview table header.

### 5.2 Job Creation Flow

```
POST /api/persistence-job  (multipart/form-data: file + persistenceTemplateId)
  │
  ├─ Multer: file held in memory (max 50 MB), only CSV/TSV/TXT accepted
  │
  ├─ Route: validates fields, reads req.user.email as createdBy
  │
  └─ PersistenceJobService.createJob()
       │
       ├─ 1. hasActiveJobForTable()
       │      Checks pjo_persistence_jobs for any row with status IN ('WAITING','RUNNING')
       │      whose template.targetTable matches. If found → throws PersistenceJobConflictError (HTTP 409).
       │      Only one active job per target table is allowed at a time.
       │
       ├─ 2. countCsvLines(buffer, hasCsvHeader)
       │      Counts non-empty lines. Subtracts 1 when hasCsvHeader=true.
       │      Stored as pjo_file_lines_count (informational; not used for execution control).
       │
       ├─ 3. createPersistenceJob() → pjo_persistence_jobs row with status = NEW
       │      Response is returned to the client immediately at this point.
       │      The rest runs asynchronously via setImmediate().
       │
       └─ 4. setImmediate(async () => { ... })
              │
              ├─ Fetch all data types from pdt_persistence_data_types
              ├─ CsvValidationService.validate()  ← full file validation
              ├─ If invalid → update job to FAILED, store first error
              ├─ If template has no targetTable → update job to FAILED
              ├─ Update job to RUNNING
              ├─ If truncateBeforeImport → TRUNCATE TABLE (outside transaction, intentional)
              ├─ CsvInsertService.insert()
              ├─ Check isJobCanceled()
              └─ Update job to SUCCESSFUL | FAILED | CANCELED
```

The HTTP response returns as soon as the job record is written (step 3). The client polls `/api/persistence-job/:id` to track progress.

### 5.3 Full Backend Validation (CsvValidationService)

Unlike the frontend's 25-row preview, the backend validates every data row in the file before writing a single row to the target table.

Per cell, the validator checks:
1. **allowNull**: if the column has `allowNull = false` and the cell is empty → error.
2. **length**: if `ptc_length` is set and `cell.length > ptc_length` → error.
3. **type regex**: if the column's type matches a `pdt_persistence_data_types` entry that has a `regularExpression`, the cell is tested against it. Unknown types (not registered in `pdt`) are silently skipped with a console warning.

The `stopOnFirstError` flag is set to `true` when the error strategy is `STOP_ON_FIRST_ERROR_AND_ROLLBACK` or `STOP_ON_FIRST_ERROR_AND_COMMIT` — in those cases validation halts at the first failing cell. For `CONTINUE_ON_ERROR` (currently the default fallback when no strategy matches), all errors are collected.

### 5.4 SQL Generation (CsvInsertService)

#### Column Resolution

Columns are sorted by `ptc_index` and resolved to CSV offsets:
- `hasCsvHeader = true`: build a `Map<string, number>` from the header row, look up `ptc_csv_column_name`.
- `hasCsvHeader = false`: use `ptc_csv_column_index` directly.

Columns with resolved offset = -1 are filtered out before SQL generation. They do not appear in the INSERT column list.

#### INSERT Strategy: INSERT (plain)

```sql
INSERT INTO schema.table ("col_a", "col_b")
VALUES ('val1', 'val2')
```

Duplicate primary keys raise a constraint violation. The error strategy then decides what happens.

#### INSERT Strategy: REPLACE (upsert)

When `duplicatesHandlingStrategy = REPLACE`:

1. The service queries `information_schema.key_column_usage` to discover the table's actual primary key columns:

```sql
SELECT kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
 AND tc.table_name      = kcu.table_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema    = 'schema'
  AND tc.table_name      = 'table'
ORDER BY kcu.ordinal_position
```

2. The conflict target comes from these discovered PK columns — not from any configuration in the template. The template does not store PK information; it is always derived from the live DB schema.

3. The generated SQL:

```sql
INSERT INTO schema.table ("pk_col", "col_a", "col_b")
VALUES ('key1', 'val1', 'val2')
ON CONFLICT ("pk_col") DO UPDATE SET
  "col_a" = EXCLUDED."col_a",
  "col_b" = EXCLUDED."col_b"
```

Only non-PK columns appear in the `DO UPDATE SET` clause. If no PK is found in `information_schema` (table has no primary key), the service falls back to a plain INSERT and emits a console warning.

**Important:** the `DO UPDATE SET` clause only lists the columns present in the template. DB columns not in the template are never touched on conflict — not set to NULL, not cleared. Existing values for those columns are preserved exactly as they are.

For new rows (no conflict): only the template's columns are written. Unmapped DB columns receive their DB-level default or NULL.

#### Batching

Rows are grouped into batches of 500 and executed as single multi-row INSERT statements:

```sql
INSERT INTO schema.table ("col_a", "col_b")
VALUES
  ('val1', 'val2'),
  ('val3', 'val4'),
  ...
ON CONFLICT (...) DO UPDATE SET ...
```

When a batch fails, the service falls back to row-by-row execution for that batch to identify the exact failing row number.

#### Value Serialisation

- Empty string cells → `NULL`
- Non-empty cells → `'value'` with single-quotes escaped as `''` (SQL-standard escaping)
- No parameterised query binding — values are interpolated into the SQL string via `$executeRawUnsafe`. This is safe only because the target tables are internal DS/ES tables not exposed to untrusted user-supplied content; the data originates from internal team uploads.

### 5.5 Error Handling Strategies

| Strategy | Behaviour on row error |
|---|---|
| `STOP_ON_FIRST_ERROR_AND_ROLLBACK` | All inserts run inside a single `prisma.$transaction`. First failure throws, Postgres rolls back the entire job. `linesInserted` reported as 0. |
| `STOP_ON_FIRST_ERROR_AND_COMMIT` | No transaction. Batches run sequentially. First failing batch falls back to row-by-row; the loop returns immediately on the first bad row. All rows before the error are committed. |
| `CONTINUE_ON_ERROR` (default fallback) | No transaction. Failing batches fall back to row-by-row; bad rows are skipped individually. Execution continues to the end of the file. First error is recorded but does not stop processing. |

### 5.6 Cancellation

Cancellation is entirely DB-driven. There is no in-process signal:

1. `POST /api/persistence-job/cancel/:id` sets `pjo_status = CANCELED` in the DB.
2. The insert loop polls `isJobCanceled(jobId)` every N rows (N is adaptive based on file size: 1, 10, 100, or 5% of total rows). When it detects `CANCELED`, the loop breaks.
3. For the `ROLLBACK` strategy, cancellation causes the active transaction to throw, rolling back all inserts.
4. For the `COMMIT` and `CONTINUE` strategies, rows already committed before the cancel check remain committed.

Only jobs in `WAITING` or `RUNNING` state can be canceled. Attempts to cancel `SUCCESSFUL`, `FAILED`, or already-`CANCELED` jobs return HTTP 400.

### 5.7 Truncate Before Import

When `pte_truncate_before_import = true`, the service executes:

```sql
TRUNCATE TABLE schema.table
```

This runs **outside any transaction**, before the insert phase begins. The implication is explicit: if the subsequent inserts fail, the truncation is not rolled back. Tables are permanently cleared even on import failure. This is a documented design decision — templates with this flag set accept that risk.

---

## 6. Data Flow Summary

```
User uploads CSV
     │
     ▼
Frontend parses first 25 rows
Validates format against pdt_persistence_data_types regex
Blocks submit on cell-level errors
     │
     ▼
POST /api/persistence-job (multipart: file + templateId)
     │
     ├── Conflict check: is another job active for the same target table?
     ├── Count CSV lines
     ├── Create pjo_persistence_jobs row (status = NEW)
     ├── Return job record to client  ◄─── HTTP response here
     │
     └── setImmediate():
           │
           ├── Fetch pdt_persistence_data_types
           ├── CsvValidationService.validate() — full file
           │     allowNull / length / regex per cell
           │     stopOnFirstError = true for ROLLBACK and COMMIT strategies
           │
           ├── [fail] → status = FAILED, store error line + message
           │
           ├── [pass] → status = RUNNING
           │
           ├── [truncateBeforeImport] → TRUNCATE TABLE (committed immediately)
           │
           ├── CsvInsertService.insert()
           │     Resolve column CSV offsets
           │     Discover PK columns from information_schema (REPLACE only)
           │     Build INSERT or INSERT ... ON CONFLICT SQL
           │     Execute in batches of 500 rows
           │     Poll isJobCanceled() every N rows
           │
           └── status = SUCCESSFUL | FAILED | CANCELED
```

---

## 7. API Reference

### Persistence Template

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/persistence-template` | read | Paginated list (`page`, `limit` query params) |
| GET | `/api/persistence-template/:id` | read | Single template with columns |
| POST | `/api/persistence-template` | create | Create template + columns |
| PUT | `/api/persistence-template/:id` | create | Full replace of template + columns |
| DELETE | `/api/persistence-template/:id` | create | Delete (blocked if jobs exist) |

### Persistence Job

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/persistence-job` | read | All jobs, newest first |
| GET | `/api/persistence-job/:id` | read | Single job with embedded template |
| POST | `/api/persistence-job` | create | Create job; body: `multipart/form-data` with `file` + `persistenceTemplateId` |
| POST | `/api/persistence-job/cancel/:id` | create | Cancel a WAITING or RUNNING job |

### Persistence Data Type

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/persistence-data-type` | read | Paginated list of registered data types |

---

## 8. Constraints and Invariants

1. **One active job per target table.** `hasActiveJobForTable` queries for `WAITING` or `RUNNING` status before creating a new job. A 409 is returned if any exists.

2. **Template column types must exist in the target table.** `isColumnInTable` validates this at save time against `information_schema`. Saved templates always describe real columns.

3. **PK columns for upsert are resolved at runtime, not stored.** The template has no PK configuration field. `fetchPrimaryKeyColumns` queries `information_schema.key_column_usage` each time a REPLACE job runs. If the table's PK changes after the template was saved, the next import picks up the new PK automatically.

4. **Unmapped columns are invisible to the import.** A column with `csvColumnIndex = -1` or `csvColumnName = null/empty` is never in the INSERT column list. The DB's own defaults apply. Non-nullable columns with no default will cause a constraint violation at insert time.

5. **REPLACE updates only columns present in the template.** The `DO UPDATE SET` clause lists exactly the non-PK columns from the template. Existing values for all other DB columns are untouched on conflict.

6. **Truncation is irreversible even on import failure.** `TRUNCATE TABLE` is executed outside any transaction. Import failure does not roll it back.

7. **Template deletion is blocked by job history.** `RESTRICT` FK ensures you cannot delete a template while job records reference it, preserving audit history.

8. **Template column definitions are fully replaced on update.** There is no partial column update. A PUT deletes all existing column rows and creates the submitted set within a single transaction.
