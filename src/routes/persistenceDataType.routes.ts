/**
 * Persistence Data Type - Routes
 *
 * Responsibility: HTTP transport layer only (thin controller).
 * All business logic lives in PersistenceDataTypeService.
 *
 * Security: every endpoint requires admin-level permission via
 * requirePermission('PersistenceDataTypes', ...), consistent
 * with the RBAC pattern used across the application.
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { persistenceDataTypeService } from '../services/persistenceDataType/PersistenceDataTypeService';
import { error } from '../logger';

const router = Router();

// --- GET /persistence-data-type/ ---------------------------------------------
// Returns a paginated list of persistence data types.
// Query params: page (default 1, min 1), limit (default 10, min 1, max 100)
router.get(
  '/',
  requirePermission('PersistenceDataTypes', 'read'),
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

      const result = await persistenceDataTypeService.getAll({ page, limit });
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch persistence data types' });
    }
  }
);

export default router;
