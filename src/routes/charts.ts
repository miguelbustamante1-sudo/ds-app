import express from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { getTeamMemberIdByAuthEmail } from '../db/users';
import { getTeamTimeOffByMonthRange } from '../services/timeoff/supervisor';

const router = express.Router();

// GET /charts/team-timeoff-by-month - Get aggregated time-off days by month for supervised team
router.get('/team-timeoff-by-month', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const data = await getTeamTimeOffByMonthRange(supervisorTeamMemberId, startDate, endDate);
    res.json(data);
  } catch (err) {
    console.error('[Charts] Error fetching team time-off by month:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off data' });
  }
});

export default router;
