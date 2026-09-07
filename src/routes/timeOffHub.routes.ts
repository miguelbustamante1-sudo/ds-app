import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import {
  getSummaryCounts,
  getSummaryRecords,
  type TimeOffHubSummaryScope,
  type TimeOffHubSummaryTab,
} from '../services/timeOffHub/TimeOffHubOrchestrator';

const router = Router();

function resolveScope(raw: unknown): TimeOffHubSummaryScope {
  return raw === 'hierarchy' ? 'hierarchy' : 'direct';
}

function resolveTab(raw: unknown): TimeOffHubSummaryTab {
  if (raw === 'upcoming-swaps' || raw === 'this-week') return raw;
  return 'upcoming-timeoff';
}

/**
 * GET /api/time-off-hub/summary
 * Returns the 3 summary card counts for the authenticated supervisor's team.
 */
router.get(
  '/summary',
  requirePermission('TimeOffs', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.teamMemberId) {
        throw new AppError('Unauthenticated', 401);
      }
      const scope = resolveScope(req.query.scope);
      const counts = await getSummaryCounts(req.user.teamMemberId, scope);
      res.json({ data: counts });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/time-off-hub/summary/records
 * Returns the underlying records behind one summary card, for the DataGrid.
 */
router.get(
  '/summary/records',
  requirePermission('TimeOffs', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.teamMemberId) {
        throw new AppError('Unauthenticated', 401);
      }
      const scope = resolveScope(req.query.scope);
      const tab = resolveTab(req.query.tab);
      const records = await getSummaryRecords(req.user.teamMemberId, scope, tab);
      res.json({ data: records });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
