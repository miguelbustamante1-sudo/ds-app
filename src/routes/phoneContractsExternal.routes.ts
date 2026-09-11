import { Router, Response } from 'express';
import { validateApiKey } from '../middleware/apiKey';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { getCorporatePhoneAssignmentsReport } from '../services/phoneContract/external/GetCorporatePhoneAssignmentsReport';
import { catchHandler } from './routeUtils';
import type { CorporatePhoneAssignmentReportQueryDTO } from '@shared/dto';

const router = Router();

// GET /api/phone-contracts/external/report
router.get(
  '/report',
  validateApiKey,
  requirePermission('PhoneAssignmentsReport', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, projectIds, projectManager } = req.query;
      const query: CorporatePhoneAssignmentReportQueryDTO = {
        ...(typeof startDate === 'string' && { startDate }),
        ...(typeof endDate === 'string' && { endDate }),
        ...(typeof projectIds === 'string' && { projectIds }),
        ...(typeof projectManager === 'string' && { projectManager }),
      };
      const rows = await getCorporatePhoneAssignmentsReport(query);
      res.json({ data: rows });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
