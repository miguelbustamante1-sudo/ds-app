import express from 'express';
import type { Response } from 'express';
import { flagTypeActionOrchestrator } from '../services/flagTypeActions';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { CreateFlagTypeActionDTO, UpdateFlagTypeActionDTO } from '@shared/dto/FlagTypeAction';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /flag-type-actions
router.get('/', requirePermission('FlagTypeActions', 'read'), async (_req, res: Response) => {
  try {
    const items = await flagTypeActionOrchestrator.getAll();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /flag-type-actions/:id
router.get('/:id', requirePermission('FlagTypeActions', 'read'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const item = await flagTypeActionOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /flag-type-actions
router.post('/', requirePermission('FlagTypeActions', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const body = req.body as CreateFlagTypeActionDTO;
    if (!body.category?.trim()) {
      res.status(400).json({ error: 'category is required' });
      return;
    }
    if (!body.actionLabel?.trim()) {
      res.status(400).json({ error: 'actionLabel is required' });
      return;
    }
    if (!body.actionUrl?.trim()) {
      res.status(400).json({ error: 'actionUrl is required' });
      return;
    }
    const created = await flagTypeActionOrchestrator.create(body, req.user.email, req.user.dsUserId);
    res.status(201).json({ data: created });
  } catch (err) {
    catchBlock(err, res);
  }
});

// PUT /flag-type-actions/:id
router.put('/:id', requirePermission('FlagTypeActions', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const updated = await flagTypeActionOrchestrator.update(
      id,
      req.body as UpdateFlagTypeActionDTO,
      req.user.email,
      req.user.dsUserId,
    );
    res.json({ data: updated });
  } catch (err) {
    catchBlock(err, res);
  }
});

// DELETE /flag-type-actions/:id
router.delete('/:id', requirePermission('FlagTypeActions', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.email) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    await flagTypeActionOrchestrator.delete(id, req.user.email);
    res.status(204).send();
  } catch (err) {
    catchBlock(err, res);
  }
});

export default router;
