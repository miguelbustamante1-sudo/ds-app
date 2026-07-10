import { Router } from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { bonusImpactOrchestrator } from '../services/bonusImpact/BonusImpactOrchestrator';

const router = Router();

router.get(
  '/',
  requirePermission('BonusImpact', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (teamMemberId == null) throw new AppError('Unauthenticated', 401);
      const items = await bonusImpactOrchestrator.listForSupervisor(teamMemberId);
      res.json({ data: items });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

router.get(
  '/all',
  requirePermission('BonusImpact', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isBsa = req.user?.roles?.includes('bsa') ?? false;
      if (!isBsa) { res.status(403).json({ error: 'Forbidden' }); return; }
      const items = await bonusImpactOrchestrator.listAll();
      res.json({ data: items });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  '/',
  requirePermission('BonusImpact', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.dsUserId;
      if (createdBy == null) throw new AppError('Unauthenticated', 401);
      const created = await bonusImpactOrchestrator.create(req.body, createdBy, req.user?.email ?? '');
      res.status(201).json({ data: created });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  },
);

router.patch(
  '/:id/notify',
  requirePermission('BonusImpact', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) { res.status(400).json({ error: 'Invalid bonus impact id' }); return; }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      const updated = await bonusImpactOrchestrator.notify(id, updatedBy, req.user?.email ?? '');
      res.json({ data: updated });
    } catch (err: unknown) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  },
);

router.patch(
  '/:id/process',
  requirePermission('BonusImpact', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) { res.status(400).json({ error: 'Invalid bonus impact id' }); return; }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      if (!req.body.bniPrlId) { res.status(400).json({ error: 'bniPrlId is required to process an impact' }); return; }
      const updated = await bonusImpactOrchestrator.process(id, req.body, updatedBy, req.user?.email ?? '');
      res.json({ data: updated });
    } catch (err: unknown) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  },
);

router.patch(
  '/:id/drop',
  requirePermission('BonusImpact', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) { res.status(400).json({ error: 'Invalid bonus impact id' }); return; }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      await bonusImpactOrchestrator.drop(id, updatedBy, req.user?.email ?? '');
      res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
