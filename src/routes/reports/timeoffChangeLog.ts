import express from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { getTimeOffChangeLog } from '../../services/reports/timeoff/changeLogQueries';
import { getReports } from '../../services/teamMember/queries/getReports';
import { getAllActiveTeamMembers } from '../../services/teamMember/queries/getAllActiveTeamMembers';
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
      const supervisorTmId = req.user!.teamMemberId;
      if (!supervisorTmId) {
        return res.status(403).json({ error: 'No team member profile associated with your account' });
      }

      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      const members = viewAll
        ? await getAllActiveTeamMembers()
        : await getReports(supervisorTmId, true);
      const supervisedIds = members.map((r) => r.teamMemberId);

      const params = req.query as TimeOffChangeLogQueryDTO;
      const { rows, total, capped } = await getTimeOffChangeLog(params, supervisedIds);

      if (params.export === 'true') {
        if (capped) {
          res.setHeader('X-Export-Capped', 'true');
          res.setHeader('X-Export-Cap', '1000000');
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
