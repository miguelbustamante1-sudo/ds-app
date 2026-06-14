import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { getDashboardTasks } from '../services/dashboard/getDashboardTasks';
import { getDashboardImportantDates } from '../services/dashboard/getDashboardImportantDates';

const router = Router();

/**
 * GET /api/dashboard/tasks
 * Returns action items awaiting the authenticated user's action.
 */
router.get(
  '/tasks',
  requirePermission('TeamMembers', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = req.user?.teamMemberId;
      if (!supervisorId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const tasks = await getDashboardTasks(supervisorId);
      res.json(tasks);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/dashboard/important-dates
 * Returns upcoming time offs, holidays and birthdays for the next 60 days.
 */
router.get(
  '/important-dates',
  requirePermission('TeamMembers', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = req.user?.teamMemberId;
      if (!supervisorId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const dates = await getDashboardImportantDates(supervisorId);
      res.json(dates);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
