import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/auth';
import { tmId, catchHandler } from '../routeUtils';
import { performanceCaseReportOrchestrator } from '../../services/reports/performance-cases/PerformanceCaseReportOrchestrator';
import type { PerformanceCaseReportFilters } from '../../services/reports/performance-cases/components/QueryPerformanceCaseReport';

const router = Router();

// GET /api/reports/performance-cases
router.get(
  '/',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Built via conditional spread (rather than assigning `undefined` to each optional
      // property) because this repo's tsconfig sets `exactOptionalPropertyTypes: true`,
      // which rejects an explicit `undefined` value against an optional string property.
      const filters: PerformanceCaseReportFilters = {
        ...(req.query.dateField
          ? { dateField: req.query.dateField as 'createdDate' | 'closureSignoffDate' }
          : {}),
        ...(req.query.dateFrom ? { dateFrom: req.query.dateFrom as string } : {}),
        ...(req.query.dateTo ? { dateTo: req.query.dateTo as string } : {}),
        ...(req.query.severityTier ? { severityTier: req.query.severityTier as string } : {}),
        ...(req.query.currentPhase ? { currentPhase: req.query.currentPhase as string } : {}),
        ...(req.query.caseStatus ? { caseStatus: req.query.caseStatus as string } : {}),
        ...(req.query.rcaType ? { rcaType: req.query.rcaType as string } : {}),
        ...(req.query.teamLeaderId ? { teamLeaderId: Number(req.query.teamLeaderId) } : {}),
      };
      const result = await performanceCaseReportOrchestrator.run(tmId(req), filters);
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
