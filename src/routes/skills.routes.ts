import { Router, Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { jobProfileOrchestrator } from '../services/jobProfile/JobProfileOrchestrator';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

// GET /api/skills
router.get('/', requirePermission('Endorsements', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const skills = await jobProfileOrchestrator.getSkills();
    res.json({ data: skills });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

export default router;
