import { Router, Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { getActivityLog } from '../../services/timeoff/activityLog/queries';
import { getReportsForActivityLog } from '../../services/teamMember';

export const activityLogRouter = Router();

activityLogRouter.get(
  '/',
  requirePermission('TimeOffs', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(403).json({ error: 'Current user is not linked to a team member' });
    }

    const scope    = req.query.scope === 'team' ? 'team' : 'mine';
    const page     = Math.max(0, Number(req.query.page     ?? 0));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25)));

    let teamMemberIds: number[];

    if (scope === 'team') {
      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      teamMemberIds = await getReportsForActivityLog(teamMemberId, viewAll);
      if (teamMemberIds.length === 0) {
        return res.json({ data: [], total: 0, page, pageSize });
      }
    } else {
      teamMemberIds = [teamMemberId];
    }

    const { data, total } = await getActivityLog({ teamMemberIds, page, pageSize });
    return res.json({ data, total, page, pageSize });
  },
);
