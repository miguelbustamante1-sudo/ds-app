import { Router, Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { jobProfileOrchestrator } from '../services/jobProfile/JobProfileOrchestrator';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

// GET /api/groups
router.get('/', requirePermission('Endorsements', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const groups = await jobProfileOrchestrator.getGroups();
    res.json({ data: groups });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

export default router;
