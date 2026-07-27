import { Router, Request, Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { jobProfileOrchestrator } from '../services/jobProfile/JobProfileOrchestrator';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// GET /api/job-profiles/derive?posId&tibId&sklId&grpId
router.get(
  '/derive',
  requirePermission('Endorsements', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = (req as Request).query;
      const posId = parsePositiveInt(query.posId);
      const tibId = parsePositiveInt(query.tibId);
      const sklId = parsePositiveInt(query.sklId);
      const grpId = parsePositiveInt(query.grpId);

      if (!posId || !tibId || !sklId || !grpId) {
        res.status(400).json({ error: 'posId, tibId, sklId, and grpId are all required positive integers' });
        return;
      }

      const result = await jobProfileOrchestrator.deriveJobProfile(posId, tibId, sklId, grpId);
      res.json({ data: result });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to derive job profile' });
    }
  },
);

export default router;
