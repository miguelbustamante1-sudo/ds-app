import express from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { getUpcomingVacation } from '../../services/reports/timeoff/UpcomingVacationOrchestrator';
import { AppError } from '../../errors/AppError';

const router = express.Router();

// GET /api/reports/time-off/upcoming-vacation
router.get(
  '/',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTmId = req.user!.teamMemberId;
      if (!supervisorTmId) {
        return res.status(403).json({ error: 'No team member profile associated with your account' });
      }
      const teamMemberIdRaw = req.query.teamMemberId
        ? Number(req.query.teamMemberId)
        : null;
      const daysRaw = req.query.days ? Number(req.query.days) : 45;

      if (teamMemberIdRaw !== null && Number.isNaN(teamMemberIdRaw)) {
        return res.status(400).json({ error: 'Invalid teamMemberId' });
      }
      if (Number.isNaN(daysRaw)) {
        return res.status(400).json({ error: 'Invalid days' });
      }

      const data = await getUpcomingVacation(supervisorTmId, teamMemberIdRaw, daysRaw);

      if (req.query.export === 'true') {
        return res.json(data);
      }
      res.json({ data });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[reports/time-off/upcoming-vacation] Error:', err);
      res.status(500).json({ error: 'Failed to fetch upcoming vacation report' });
    }
  },
);

export default router;
