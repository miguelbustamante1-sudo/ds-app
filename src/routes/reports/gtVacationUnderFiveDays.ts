import express from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { getGtVacationUnderFiveDays } from '../../services/reports/timeoff/GtVacationUnderFiveDaysOrchestrator';
import { AppError } from '../../errors/AppError';

const router = express.Router();

// GET /api/reports/time-off/gt-vacation-under-five-days
router.get(
  '/',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTmId = req.user?.teamMemberId;
      if (!supervisorTmId) {
        return res.status(403).json({ error: 'No team member profile associated with your account' });
      }

      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      const data = await getGtVacationUnderFiveDays(supervisorTmId, viewAll);
      res.json({ data });
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
