import { Router } from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { payrolOrchestrator } from '../services/payrol/PayrolOrchestrator';

const router = Router();

router.get(
  '/',
  requirePermission('PayrolManagement', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const items = await payrolOrchestrator.list();
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
  requirePermission('PayrolManagement', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.dsUserId;
      if (createdBy == null) throw new AppError('Unauthenticated', 401);
      const created = await payrolOrchestrator.create(req.body, createdBy, req.user?.email ?? '');
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
  '/:id',
  requirePermission('PayrolManagement', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid payrol id' });
        return;
      }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      const updated = await payrolOrchestrator.update(id, req.body, updatedBy, req.user?.email ?? '');
      res.json({ data: updated });
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
  '/:id/close',
  requirePermission('PayrolManagement', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid payrol id' });
        return;
      }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      const closed = await payrolOrchestrator.close(id, updatedBy, req.user?.email ?? '');
      res.json({ data: closed });
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

router.delete(
  '/:id',
  requirePermission('PayrolManagement', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid payrol id' });
        return;
      }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      await payrolOrchestrator.drop(id, updatedBy, req.user?.email ?? '');
      res.status(204).send();
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

export default router;
