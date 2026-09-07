import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { getDashboardTasks } from '../services/dashboard/getDashboardTasks';
import { getDashboardImportantDates } from '../services/dashboard/getDashboardImportantDates';
import { getDashboardTrivia } from '../services/dashboard/getDashboardTrivia';
import { getSupervisorFlags } from '../services/dashboard/getSupervisorFlags';
import { AppError } from '../errors/AppError';

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

/**
 * GET /api/dashboard/trivia
 * Returns trivia questions generated from the TL manual via Fuel iX, cached
 * in memory for up to 12 hours. Authenticated-only (relies on the global
 * authMiddleware); no per-resource permission — trivia carries no sensitive
 * data, unlike the team-scoped panels.
 */
router.get('/trivia', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const questions = await getDashboardTrivia();
    res.json({ data: questions });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/dashboard/supervisor-flags
 * Returns the calling supervisor's own direct reports' flags — scoped
 * server-side via getSupervisorFlags, not by any client-side filtering.
 */
router.get(
  '/supervisor-flags',
  requirePermission('TeamMembers', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = req.user?.teamMemberId;
      if (!supervisorId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const flags = await getSupervisorFlags(supervisorId);
      res.json({ data: flags });
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
