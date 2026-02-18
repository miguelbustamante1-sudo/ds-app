import express from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { getTimeOffChangeLog } from '../../services/reports/timeoff/changeLogQueries';
import type {
  TimeOffChangeLogQueryDTO,
  TimeOffChangeLogResponseDTO,
} from '@shared/dto/TimeOffChangeLog';

const router = express.Router();

// GET /api/reports/time-off/change-log
router.get(
  '/',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.query as TimeOffChangeLogQueryDTO;
      const { rows, total, capped } = await getTimeOffChangeLog(params);

      if (params.export === 'true') {
        if (capped) {
          res.setHeader('X-Export-Capped', 'true');
          res.setHeader('X-Export-Cap', '50000');
        }
        return res.json(rows);
      }

      const response: TimeOffChangeLogResponseDTO = {
        data: rows,
        total,
        page: Number(params.page ?? 0),
        pageSize: Number(params.pageSize ?? 25),
      };
      res.json(response);
    } catch (err) {
      console.error('[reports/time-off/change-log] Error:', err);
      res.status(500).json({ error: 'Failed to fetch time off change log' });
    }
  },
);

export default router;
