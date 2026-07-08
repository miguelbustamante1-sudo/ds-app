import { Router, Response } from 'express';
import { validateApiKey } from '../../middleware/apiKey';
import { requirePermission, type AuthenticatedRequest } from '../../middleware/auth';
import { getActiveTimeOffsByWorkdayId } from '../../services/timeoff/external/GetActiveTimeOffsByWorkdayId';
import { catchHandler } from '../routeUtils';

const router = Router();

// GET /api/time-offs/external/by-workday-id/:wdid
router.get(
  '/by-workday-id/:wdid',
  validateApiKey,
  requirePermission('TimeOffLookup', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const wdid = req.params['wdid'] ?? '';
      const timeOffs = await getActiveTimeOffsByWorkdayId(wdid);
      res.json({ data: timeOffs });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
