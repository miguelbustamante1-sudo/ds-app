/**
 * Persistence Template - Routes
 *
 * Responsibility: HTTP transport layer only (thin controller).
 * All business logic lives in PersistenceTemplateService.
 *
 * Security: every endpoint requires admin-level permission via
 * requirePermission('PersistenceTemplates', ...), consistent
 * with the RBAC pattern used across the application.
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import {
  persistenceTemplateService,
  ErrorHandlingStrategy,
  DEFAULT_ERROR_HANDLING_STRATEGY,
  isValidErrorHandlingStrategy,
  isTargetTableInDatabase,
  isColumnInTable,
  DuplicatesHandlingStrategy,
  DEFAULT_DUPLICATES_HANDLING_STRATEGY,
  isValidDuplicatesHandlingStrategy,
  PersistenceTemplateHasJobsError,
  PersistenceTemplateNameConflictError,
} from '../services/persistenceTemplate/PersistenceTemplateService';
import type { CreatePersistenceTemplateColumnInput } from '../../shared/dto/PersistenceTemplate';
import { error } from '../logger';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that CSV column references within a column list are unique.
 *
 * - hasCsvHeader=true  -> csvColumnName must be unique (nulls/empty strings exempt)
 * - hasCsvHeader=false -> csvColumnIndex must be unique (-1 and missing values exempt)
 *
 * Returns an error message string when a violation is found, or null when valid.
 */
function validateCsvColumnUniqueness(
  hasCsvHeader: boolean,
  rawColumns: Array<Record<string, unknown>>,
): string | null {
  if (hasCsvHeader) {
    const names = rawColumns
      .map((c) => (typeof c['csvColumnName'] === 'string' ? c['csvColumnName'].trim() : ''))
      .filter((n) => n !== '');
    const seen = new Set<string>();
    for (const n of names) {
      if (seen.has(n)) {
        return `Duplicate CSV Column Name '${n}'`;
      }
      seen.add(n);
    }
  } else {
    const indices = rawColumns
      .map((c) => (typeof c['csvColumnIndex'] === 'number' ? c['csvColumnIndex'] : -1))
      .filter((i) => i !== -1);
    const seen = new Set<number>();
    for (const i of indices) {
      if (seen.has(i)) {
        return `Duplicate CSV Column Index '${i}'`;
      }
      seen.add(i);
    }
  }
  return null;
}

// --- GET /persistence-template/ ----------------------------------------------
// Returns a paginated list of persistence templates.
// Query params: page (default 1, min 1), limit (default 10, min 1, max 100)
router.get(
  '/',
  requirePermission('PersistenceTemplates', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawPage = (req as Request).query['page'];
      const rawLimit = (req as Request).query['limit'];

      const page = rawPage !== undefined ? parseInt(String(rawPage), 10) : 1;
      const limit = rawLimit !== undefined ? parseInt(String(rawLimit), 10) : 10;

      if (isNaN(page) || page < 1) {
        res.status(400).json({ error: '`page` must be an integer >= 1' });
        return;
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({ error: '`limit` must be an integer between 1 and 100' });
        return;
      }

      const result = await persistenceTemplateService.getAll({ page, limit });
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch persistence templates' });
    }
  }
);

// --- GET /persistence-template/:id -------------------------------------------
// Returns a single persistence template by id.
// 404 if not found.
router.get(
  '/:id',
  requirePermission('PersistenceTemplates', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt((req as Request).params['id'] ?? '', 10);

      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const template = await persistenceTemplateService.getById(id);

      if (!template) {
        res.status(404).json({ error: `Persistence template with id ${id} not found` });
        return;
      }

      res.json(template);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch persistence template' });
    }
  }
);

// --- PUT /persistence-template/:id -------------------------------------------
// Fully replaces a persistence template's fields and columns.
// 404 if not found, 400 for invalid input.
router.put(
  '/:id',
  requirePermission('PersistenceTemplates', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt((req as Request).params['id'] ?? '', 10);

      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const body = (req as Request).body as {
        name?: unknown;
        description?: unknown;
        hasCsvHeader?: unknown;
        truncateBeforeImport?: unknown;
        targetTable?: unknown;
        enabled?: unknown;
        errorHandlingStrategy?: unknown;
        duplicatesHandlingStrategy?: unknown;
        columns?: unknown;
      };

      const { name, description, hasCsvHeader, truncateBeforeImport, targetTable, enabled, errorHandlingStrategy, duplicatesHandlingStrategy, columns } = body;

      // -- Validation ----------------------------------------------------------
      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: '`name` is required and must be a non-empty string' });
        return;
      }

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        res.status(400).json({ error: '`enabled` must be a boolean when provided' });
        return;
      }

      if (hasCsvHeader !== undefined && typeof hasCsvHeader !== 'boolean') {
        res.status(400).json({ error: '`hasCsvHeader` must be a boolean when provided' });
        return;
      }

      if (truncateBeforeImport !== undefined && typeof truncateBeforeImport !== 'boolean') {
        res.status(400).json({ error: '`truncateBeforeImport` must be a boolean when provided' });
        return;
      }

      if (description !== undefined && typeof description !== 'string') {
        res.status(400).json({ error: '`description` must be a string when provided' });
        return;
      }

      if (targetTable !== undefined && typeof targetTable !== 'string') {
        res.status(400).json({ error: '`targetTable` must be a string when provided' });
        return;
      }

      if (targetTable !== undefined && targetTable.indexOf('.') < 1) {
        res.status(400).json({ error: '`targetTable` must follow the format <namespace>.<table>' });
        return;
      }

      const [tableNamespace = '', tableName = ''] = targetTable?.split('.') ?? [];

      // Validate the submitted targetTable actually exists in the database
      if (typeof targetTable === 'string' && !(await isTargetTableInDatabase(tableNamespace, tableName))) {
        res.status(400).json({ error: `\`targetTable\` '${targetTable}' does not exist in the database` });
        return;
      }

      if (errorHandlingStrategy !== undefined && !isValidErrorHandlingStrategy(errorHandlingStrategy)) {
        res.status(400).json({
          error: `\`errorHandlingStrategy\` must be one of: ${Object.values(ErrorHandlingStrategy).join(', ')}`,
        });
        return;
      }

      if (duplicatesHandlingStrategy !== undefined && !isValidDuplicatesHandlingStrategy(duplicatesHandlingStrategy)) {
        res.status(400).json({
          error: `\`duplicatesHandlingStrategy\` must be one of: ${Object.values(DuplicatesHandlingStrategy).join(', ')}`,
        });
        return;
      }

      if (columns !== undefined && !Array.isArray(columns)) {
        res.status(400).json({ error: '`columns` must be an array when provided' });
        return;
      }

      const rawColumns = (columns as Array<Record<string, unknown>> | undefined) ?? [];
      for (let i = 0; i < rawColumns.length; i++) {
        const col = rawColumns[i];
        if (!col || !col['name'] || typeof col['name'] !== 'string' || (col['name'] as string).trim() === '') {
          res.status(400).json({ error: `columns[${i}].name is required` });
          return;
        }
        if (col['index'] !== undefined && typeof col['index'] !== 'number') {
          res.status(400).json({ error: `columns[${i}].index must be a number` });
          return;
        }

        const colName = col['name'] as string;
        const colDataType = typeof col['type'] === 'string' ? col['type'] : undefined;
        const colAllowNull = typeof col['allowNull'] === 'boolean' ? col['allowNull'] : undefined;

        if (!(await isColumnInTable(tableNamespace, tableName, colName, colDataType, colAllowNull))) {
          res.status(400).json({
            error:
              `No column matching the given specification was found in '${tableNamespace}.${tableName}'. ` +
              `Column specification to match: column, dataType, allowNull`,
          });
          return;
        }
      }

      const csvUniquenessError = validateCsvColumnUniqueness(
        typeof hasCsvHeader === 'boolean' ? hasCsvHeader : false,
        rawColumns,
      );
      if (csvUniquenessError) {
        res.status(400).json({ error: csvUniquenessError });
        return;
      }

      const mappedColumns: CreatePersistenceTemplateColumnInput[] = rawColumns.map((col, i) => ({
        index: typeof col['index'] === 'number' ? col['index'] : i,
        name: (col['name'] as string).trim(),
        type: typeof col['type'] === 'string' ? col['type'] : null,
        length: typeof col['length'] === 'number' ? col['length'] : null,
        allowNull: typeof col['allowNull'] === 'boolean' ? col['allowNull'] : true,
        comment: typeof col['comment'] === 'string' ? col['comment'] : null,
        csvColumnName: typeof col['csvColumnName'] === 'string' ? col['csvColumnName'] : null,
        csvColumnIndex: typeof col['csvColumnIndex'] === 'number' ? col['csvColumnIndex'] : -1,
      }));

      const updatedBy: string = req.user?.email ?? 'unknown';

      const template = await persistenceTemplateService.update(id, {
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        hasCsvHeader: typeof hasCsvHeader === 'boolean' ? hasCsvHeader : false,
        truncateBeforeImport: typeof truncateBeforeImport === 'boolean' ? truncateBeforeImport : false,
        targetTable: typeof targetTable === 'string' ? targetTable : null,
        enabled: typeof enabled === 'boolean' ? enabled : true,
        errorHandlingStrategy:
          errorHandlingStrategy !== undefined
            ? (errorHandlingStrategy as ErrorHandlingStrategy)
            : DEFAULT_ERROR_HANDLING_STRATEGY,
        duplicatesHandlingStrategy:
          duplicatesHandlingStrategy !== undefined
            ? (duplicatesHandlingStrategy as DuplicatesHandlingStrategy)
            : DEFAULT_DUPLICATES_HANDLING_STRATEGY,
        updatedBy,
        columns: mappedColumns,
      });

      if (!template) {
        res.status(404).json({ error: `Persistence template with id ${id} not found` });
        return;
      }

      res.json(template);
    } catch (err) {
      if (err instanceof PersistenceTemplateNameConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update persistence template' });
    }
  }
);

// --- POST /persistence-template/ ---------------------------------------------
// Creates a new persistence template with its columns.
// Body: PersistenceTemplateBody (name required, columns optional)
router.post(
  '/',
  requirePermission('PersistenceTemplates', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req as Request).body as {
        name?: unknown;
        description?: unknown;
        hasCsvHeader?: unknown;
        truncateBeforeImport?: unknown;
        targetTable?: unknown;
        enabled?: unknown;
        errorHandlingStrategy?: unknown;
        duplicatesHandlingStrategy?: unknown;
        columns?: unknown;
      };

      const { name, description, hasCsvHeader, truncateBeforeImport, targetTable, enabled, errorHandlingStrategy, duplicatesHandlingStrategy, columns } = body;

      // -- Validation ----------------------------------------------------------
      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: '`name` is required and must be a non-empty string' });
        return;
      }

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        res.status(400).json({ error: '`enabled` must be a boolean when provided' });
        return;
      }

      if (hasCsvHeader !== undefined && typeof hasCsvHeader !== 'boolean') {
        res.status(400).json({ error: '`hasCsvHeader` must be a boolean when provided' });
        return;
      }

      if (truncateBeforeImport !== undefined && typeof truncateBeforeImport !== 'boolean') {
        res.status(400).json({ error: '`truncateBeforeImport` must be a boolean when provided' });
        return;
      }

      if (description !== undefined && typeof description !== 'string') {
        res.status(400).json({ error: '`description` must be a string when provided' });
        return;
      }

      if (targetTable !== undefined && typeof targetTable !== 'string') {
        res.status(400).json({ error: '`targetTable` must be a string when provided' });
        return;
      }

      if (targetTable !== undefined && targetTable.indexOf('.') < 1) {
        res.status(400).json({ error: '`targetTable` must follow the format <namespace>.<table>' });
        return;
      }

      const [tableNamespace = '', tableName = ''] = targetTable?.split('.') ?? [];

      // Validate the submitted targetTable actually exists in the database
      if (typeof targetTable === 'string' && !(await isTargetTableInDatabase(tableNamespace, tableName))) {
        res.status(400).json({ error: `\`targetTable\` '${targetTable}' does not exist in the database` });
        return;
      }

      if (errorHandlingStrategy !== undefined && !isValidErrorHandlingStrategy(errorHandlingStrategy)) {
        res.status(400).json({
          error: `\`errorHandlingStrategy\` must be one of: ${Object.values(ErrorHandlingStrategy).join(', ')}`,
        });
        return;
      }

      if (duplicatesHandlingStrategy !== undefined && !isValidDuplicatesHandlingStrategy(duplicatesHandlingStrategy)) {
        res.status(400).json({
          error: `\`duplicatesHandlingStrategy\` must be one of: ${Object.values(DuplicatesHandlingStrategy).join(', ')}`,
        });
        return;
      }

      if (columns !== undefined && !Array.isArray(columns)) {
        res.status(400).json({ error: '`columns` must be an array when provided' });
        return;
      }

      // Validate each column entry
      const rawColumns = (columns as Array<Record<string, unknown>> | undefined) ?? [];
      for (let i = 0; i < rawColumns.length; i++) {
        const col = rawColumns[i];
        if (!col || !col['name'] || typeof col['name'] !== 'string' || (col['name'] as string).trim() === '') {
          res.status(400).json({ error: `columns[${i}].name is required` });
          return;
        }
        if (col['index'] !== undefined && typeof col['index'] !== 'number') {
          res.status(400).json({ error: `columns[${i}].index must be a number` });
          return;
        }

        const colName = col['name'] as string;
        const colDataType = typeof col['type'] === 'string' ? col['type'] : undefined;
        const colAllowNull = typeof col['allowNull'] === 'boolean' ? col['allowNull'] : undefined;

        if (!(await isColumnInTable(tableNamespace, tableName, colName, colDataType, colAllowNull))) {
          res.status(400).json({
            error:
              `No column matching the given specification was found in '${tableNamespace}.${tableName}'. ` +
              `Column specification to match: column, dataType, allowNull`,
          });
          return;
        }
      }

      const csvUniquenessErrorPost = validateCsvColumnUniqueness(
        typeof hasCsvHeader === 'boolean' ? hasCsvHeader : false,
        rawColumns,
      );
      if (csvUniquenessErrorPost) {
        res.status(400).json({ error: csvUniquenessErrorPost });
        return;
      }

      // -- Map columns (camelCase per YAML spec) --------------------------------
      const mappedColumns: CreatePersistenceTemplateColumnInput[] = rawColumns.map((col, i) => ({
        index: typeof col['index'] === 'number' ? col['index'] : i,
        name: (col['name'] as string).trim(),
        type: typeof col['type'] === 'string' ? col['type'] : null,
        length: typeof col['length'] === 'number' ? col['length'] : null,
        allowNull: typeof col['allowNull'] === 'boolean' ? col['allowNull'] : true,
        comment: typeof col['comment'] === 'string' ? col['comment'] : null,
        csvColumnName: typeof col['csvColumnName'] === 'string' ? col['csvColumnName'] : null,
        csvColumnIndex: typeof col['csvColumnIndex'] === 'number' ? col['csvColumnIndex'] : -1,
      }));

      // -- Create ---------------------------------------------------------------
      const createdBy: string = req.user?.email ?? 'unknown';

      const template = await persistenceTemplateService.create({
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        hasCsvHeader: typeof hasCsvHeader === 'boolean' ? hasCsvHeader : false,
        truncateBeforeImport: typeof truncateBeforeImport === 'boolean' ? truncateBeforeImport : false,
        targetTable: typeof targetTable === 'string' ? targetTable : null,
        enabled: typeof enabled === 'boolean' ? enabled : true,
        errorHandlingStrategy:
          errorHandlingStrategy !== undefined
            ? (errorHandlingStrategy as ErrorHandlingStrategy)
            : DEFAULT_ERROR_HANDLING_STRATEGY,
        duplicatesHandlingStrategy:
          duplicatesHandlingStrategy !== undefined
            ? (duplicatesHandlingStrategy as DuplicatesHandlingStrategy)
            : DEFAULT_DUPLICATES_HANDLING_STRATEGY,
        createdBy,
        columns: mappedColumns,
      });

      res.status(201).json(template);
    } catch (err) {
      if (err instanceof PersistenceTemplateNameConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create persistence template' });
    }
  }
);

// --- DELETE /persistence-template/:id ----------------------------------------
// Deletes a persistence template and all its columns.
// Requires the same admin-level permission as create/update (create permission).
// Returns 200 on success, 404 if not found, 400 for invalid id.
router.delete(
  '/:id',
  requirePermission('PersistenceTemplates', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt((req as Request).params['id'] ?? '', 10);

      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const deleted = await persistenceTemplateService.delete(id);

      if (!deleted) {
        res.status(404).json({ error: `Persistence template with id ${id} not found` });
        return;
      }

      res.status(200).json({ message: `Persistence template ${id} deleted successfully` });
    } catch (err) {
      if (err instanceof PersistenceTemplateHasJobsError) {
        res.status(409).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to delete persistence template' });
    }
  }
);

export default router;
