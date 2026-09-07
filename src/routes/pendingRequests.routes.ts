import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { getPendingRequests } from '../services/team/pendingRequests/getPendingRequests';

const router = Router();

/** GET /api/team/pending-requests — supervisor's full pending-request inbox */
router.get(
  '/',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = req.user?.teamMemberId;
      if (!supervisorId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      const requests = await getPendingRequests(supervisorId, viewAll);
      res.json(requests);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
