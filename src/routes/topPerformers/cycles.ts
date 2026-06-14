import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../../middleware/auth';
import { createCycle, updateCycleStatus } from '../../services/topPerformers/cycles/cycleService';
import { getAllCycles, getCycleById, getActiveCycle } from '../../services/topPerformers/cycles/cycleQueries';
import { AppError } from '../../errors/AppError';
import type { CreateTpCycleDTO, UpdateTpCycleStatusDTO } from '@shared/dto/TopPerformersCycle';
import { anonymizeCycle } from '../../services/topPerformers/anonymization/anonymizationOrchestrator';

const router = Router();

// GET /api/top-performers/cycles
router.get('/', requirePermission('TopPerformers', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cycles = await getAllCycles();
    res.json({ data: cycles });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /api/top-performers/cycles/active
router.get('/active', requirePermission('TopPerformers', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cycle = await getActiveCycle();
    res.json({ data: cycle });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /api/top-performers/cycles/:id
router.get('/:id', requirePermission('TopPerformers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) throw new AppError('Invalid cycle ID', 400);
    const cycle = await getCycleById(id);
    res.json({ data: cycle });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/cycles
router.post('/', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user?.email) throw new AppError('Unauthenticated', 401);

    const body = req.body as CreateTpCycleDTO;
    if (!body.cycName?.trim()) throw new AppError('Cycle name is required', 400);
    if (!body.cycNominationsStart || !body.cycNominationsEnd || !body.cycVotingStart || !body.cycVotingEnd)
      throw new AppError('All date fields are required', 400);

    const cycle = await createCycle({
      cycName: body.cycName.trim(),
      cycNominationsStart: new Date(body.cycNominationsStart),
      cycNominationsEnd: new Date(body.cycNominationsEnd),
      cycVotingStart: new Date(body.cycVotingStart),
      cycVotingEnd: new Date(body.cycVotingEnd),
      createdBy: req.user.dsUserId,
      userEmail: req.user.email,
    });

    res.status(201).json({ data: cycle });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
});

// PATCH /api/top-performers/cycles/:id/status
router.patch('/:id/status', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user?.email) throw new AppError('Unauthenticated', 401);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) throw new AppError('Invalid cycle ID', 400);

    const { cycStatus } = req.body as UpdateTpCycleStatusDTO;
    const cycle = await updateCycleStatus({
      cycId: id,
      cycStatus,
      updatedBy: req.user.dsUserId,
      userEmail: req.user.email,
    });
    res.json({ data: cycle });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/cycles/:id/anonymize
// TopPerformers_Admin only — batch AI anonymization trigger
router.post('/:id/anonymize', requirePermission('TopPerformers_Admin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dsUserId = req.user?.dsUserId;
    const email = req.user?.email;
    if (!dsUserId || !email) throw new AppError('Unauthenticated', 401);
    const id = parseInt(req.params['id'] ?? '', 10);
    if (isNaN(id)) throw new AppError('Invalid cycle ID', 400);
    const result = await anonymizeCycle(id, dsUserId, email);
    res.json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
