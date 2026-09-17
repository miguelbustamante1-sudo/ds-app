import express from 'express';
import type { Response } from 'express';
import { supervisorCoverageOrchestrator } from '../services/supervisorCoverage';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { CreateSupervisorCoverageDTO } from '@shared/dto/SupervisorCoverage';

const router = express.Router();

router.get('/', requirePermission('SupervisorCoverage', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await supervisorCoverageOrchestrator.getAll();
    res.json({ data: items });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.post('/', requirePermission('SupervisorCoverage', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateSupervisorCoverageDTO;
    if (!body.fromSupervisorId) return res.status(400).json({ error: 'fromSupervisorId is required' });
    if (!body.toSupervisorId) return res.status(400).json({ error: 'toSupervisorId is required' });
    if (!body.coverageStartDate) return res.status(400).json({ error: 'coverageStartDate is required' });

    if (req.user?.dsUserId === undefined) {
      throw new AppError('Unauthenticated', 401);
    }

    const created = await supervisorCoverageOrchestrator.create(body, req.user.email, req.user.dsUserId);
    res.status(201).json({ data: created });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.post('/:id/end-early', requirePermission('SupervisorCoverage', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    if (req.user?.dsUserId === undefined) {
      throw new AppError('Unauthenticated', 401);
    }

    const updated = await supervisorCoverageOrchestrator.endEarly(id, req.user.email, req.user.dsUserId);
    res.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
